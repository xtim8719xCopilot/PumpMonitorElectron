import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { MqttConfig, ConnectionStatus } from '../types';
import { parseTopic, tagTopic, SCADA_HEARTBEAT_TAG } from '../constants/topics';
import { usePumpStore } from '../store/usePumpStore';
import { useAlarmStore } from '../store/useAlarmStore';
import { useSiteStore } from '../store/useSiteStore';

type StatusListener = (status: ConnectionStatus) => void;
type MessageListener = (topic: string, value: string) => void;

class MqttService {
  private client: MqttClient | null = null;
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: StatusListener[] = [];
  private messageListeners: MessageListener[] = [];
  private _messageCount = 0;
  private _subscribedTopic: string | null = null;
  private _customerId: string | null = null;

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  get messageCount(): number {
    return this._messageCount;
  }

  get subscribedTopic(): string | null {
    return this._subscribedTopic;
  }

  onStatusChange(fn: StatusListener): () => void {
    this.statusListeners.push(fn);
    return () => {
      this.statusListeners = this.statusListeners.filter((l) => l !== fn);
    };
  }

  /** Subscribe to receive the last-seen topic + raw value (for diagnostics). */
  onMessage(fn: MessageListener): () => void {
    this.messageListeners.push(fn);
    return () => {
      this.messageListeners = this.messageListeners.filter((l) => l !== fn);
    };
  }

  connect(config: MqttConfig): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }

    this.setStatus('connecting');

    const options: IClientOptions = {
      clientId: config.clientId,
      username: config.username,
      password: config.password,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 15000,
      rejectUnauthorized: true,
      protocolVersion: 4,  // Force MQTT 3.1.1 — avoids MQTT 5 framing issues on some broker free tiers
      resubscribe: false,  // We handle resubscription ourselves in the connect handler
    };

    const url = `wss://${config.host}:${config.port}/mqtt`;
    this.client = mqtt.connect(url, options);

    this._customerId = config.customerId;

    this.client.on('connect', () => {
      this.setStatus('connected');
      const siteIds = Array.isArray(config.siteIds) ? config.siteIds : [];
      if (siteIds.length === 0) {
        this._subscribedTopic = 'ERROR: no Site IDs configured — re-save credentials in Settings';
        return;
      }

      const topics = siteIds.map((s) => `scada/${config.customerId}/${s}/+`);
      let remaining = topics.length;
      const denied: string[] = [];

      topics.forEach((topic) => {
        try {
          this.client!.subscribe(topic, { qos: 0 }, (err, granted) => {
            remaining -= 1;
            if (err || (granted?.[0]?.qos === 128)) {
              denied.push(topic);
            }
            if (remaining === 0) {
              this._subscribedTopic = denied.length > 0
                ? `DENIED: ${denied.join(', ')}`
                : topics.join(', ');
            }
          });
        } catch (e) {
          this._subscribedTopic = `ERROR: ${String(e)}`;
        }
      });
    });

    this.client.on('reconnect', () => {
      this.setStatus('connecting');
    });

    this.client.on('error', () => {
      this.setStatus('error');
    });

    this.client.on('offline', () => {
      this.setStatus('disconnected');
    });

    this.client.on('message', (topic: string, payload: Buffer, packet) => {
      // packet.retain is true for messages delivered as retained at subscribe time.
      // Only live (non-retained) messages prove SCADA is currently running.
      this.handleMessage(topic, payload, !!(packet as { retain?: boolean }).retain);
    });
  }

  private handleMessage(topic: string, payload: Buffer, isRetained = false): void {
    this._messageCount += 1;
    const raw = payload.toString('utf8').trim();

    this.messageListeners.forEach((fn) => fn(topic, raw));

    const parsed = parseTopic(topic);
    if (!parsed) return;

    const { siteId, tagName } = parsed;

    // RapidScada publishes plain numeric strings: "0", "1", "0.000", "1.000"
    // Also handle JSON-wrapped values: {"value": 1}
    let value: number;
    try {
      const asJson = JSON.parse(raw);
      value = typeof asJson === 'number' ? asJson : Number(asJson?.value ?? asJson);
    } catch {
      value = Number(raw);
    }

    if (isNaN(value)) {
      // RS6 publishes "NaN" for channels with no valid PLC data (device offline).
      // Only a live (non-retained) NaN proves SCADA→EMQX is still running.
      if (!isRetained) useSiteStore.getState().touchSite(siteId);
      return;
    }

    // Heartbeat tag (SCADA_Heartbeat, ch135) is a monotonically-increasing counter
    // published every ~30 s purely to keep the SCADA→EMQX staleness indicator green.
    // Only live heartbeats count — retained heartbeats from the broker do not.
    if (tagName === SCADA_HEARTBEAT_TAG) {
      if (!isRetained) useSiteStore.getState().touchSite(siteId);
      return;
    }

    // Store tag values from both retained and live messages so the UI has data
    // to display once connectivity is confirmed. But only advance lastMessageAt
    // for live messages — retained messages are the broker's cached last-known
    // values and do not prove SCADA is currently running.
    useSiteStore.getState().updateTag(siteId, tagName, value, isRetained);
    usePumpStore.getState().updateFromTag(siteId, tagName, value);
    useAlarmStore.getState().updateFromTag(siteId, tagName, value);
  }

  /**
   * Publish a tag value back to RapidScada (e.g. alarm ACK, enable/disable pump).
   * Value is published as a plain numeric string matching RapidScada's expected format.
   */
  publishTag(siteId: string, tagName: string, value: 0 | 1): void {
    if (!this.client || this.status !== 'connected' || !this._customerId) return;
    const topic = tagTopic(this._customerId, siteId, tagName);
    this.client.publish(topic, String(value), { qos: 1 });
  }

  /**
   * Publish a JSON command to RapidScada's command channel.
   * Topic: scada/{customerId}/{siteId}/cmd
   * RapidScada should subscribe to this topic and process the payload via a custom script.
   *
   * Example payload: { type: 'ack_alarm', alarmId: '...', user: '...', timestamp: 123456 }
   */
  publishCommand(siteId: string, payload: Record<string, unknown>): void {
    if (!this.client || this.status !== 'connected' || !this._customerId) return;
    const topic = `scada/${this._customerId}/${siteId}/cmd`;
    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
  }

  disconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.client = null;
    }
    this._subscribedTopic = null;
    this._customerId = null;
    this.setStatus('disconnected');
  }
}

export const mqttService = new MqttService();
