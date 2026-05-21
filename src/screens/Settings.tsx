import React, { useState, useEffect } from 'react';
import { mqttService } from '../services/mqttService';
import { getItem, setItem } from '../utils/storage';
import { MqttConfig, ConnectionStatus } from '../types';

const STORAGE_KEY = 'mqtt_config';

function makeClientId(): string {
  return 'electron_' + Math.random().toString(36).slice(2, 10);
}

const DEFAULTS: MqttConfig = {
  host: '',
  port: 8084,
  username: '',
  password: '',
  clientId: makeClientId(),
  customerId: '',
  siteIds: [],
};

export default function SettingsScreen() {
  const [cfg, setCfg] = useState<MqttConfig>(DEFAULTS);
  const [siteIdsText, setSiteIdsText] = useState('');
  const [saved, setSaved] = useState(false);

  // Diagnostics state
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [subscribedTopic, setSubscribedTopic] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [msgCount, setMsgCount] = useState(0);

  useEffect(() => {
    getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const c: MqttConfig = JSON.parse(raw);
        setCfg(c);
        setSiteIdsText(Array.isArray(c.siteIds) ? c.siteIds.join(', ') : '');
      } catch {}
    });
  }, []);

  useEffect(() => {
    setStatus(mqttService.getStatus());
    setSubscribedTopic(mqttService.subscribedTopic);

    const unsubStatus = mqttService.onStatusChange((s) => {
      setStatus(s);
      setTimeout(() => setSubscribedTopic(mqttService.subscribedTopic), 500);
    });
    const unsubMsg = mqttService.onMessage((topic, value) => {
      setLastTopic(topic);
      setLastValue(value);
      setMsgCount((n) => n + 1);
    });
    return () => { unsubStatus(); unsubMsg(); };
  }, []);

  function field(key: keyof MqttConfig) {
    return {
      value: String(cfg[key] ?? ''),
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setCfg((prev) => ({ ...prev, [key]: key === 'port' ? Number(e.target.value) : e.target.value })),
    };
  }

  async function handleSave() {
    const siteIds = siteIdsText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const full: MqttConfig = { ...cfg, siteIds, clientId: cfg.clientId || makeClientId() };
    await setItem(STORAGE_KEY, JSON.stringify(full));
    setCfg(full);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    mqttService.disconnect();
    if (full.host && full.username && full.customerId && siteIds.length > 0) {
      mqttService.connect(full);
    }
  }

  function handleDisconnect() {
    mqttService.disconnect();
  }

  // Color for subscribed topic
  const topicColor = !subscribedTopic ? 'var(--text-muted)'
    : subscribedTopic.startsWith('DENIED') || subscribedTopic.startsWith('ERROR')
      ? 'var(--danger)'
      : 'var(--success)';

  return (
    <div style={{ maxWidth: 560 }}>

      {/* ── MQTT Broker Config ── */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>MQTT Broker</div>

        <div className="form-group">
          <label className="form-label">Broker Host</label>
          <input className="form-input" placeholder="abc123.emqxsl.com" {...field('host')} />
        </div>

        <div className="form-group">
          <label className="form-label">Port</label>
          <input className="form-input" type="number" {...field('port')} />
          <div className="form-hint">Default: 8084 (EMQX Cloud WSS/TLS)</div>
        </div>

        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" autoComplete="off" {...field('username')} />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="form-input" type="password" autoComplete="off" {...field('password')} />
        </div>

        <div className="form-group">
          <label className="form-label">Customer ID</label>
          <input className="form-input" placeholder="customer1" {...field('customerId')} />
          <div className="form-hint">Top-level namespace — must match EMQX ACL</div>
        </div>

        <div className="form-group">
          <label className="form-label">Site IDs</label>
          <input
            className="form-input"
            placeholder="site-001, site-002"
            value={siteIdsText}
            onChange={(e) => setSiteIdsText(e.target.value)}
          />
          <div className="form-hint">Comma-separated. Subscribes to scada/&#123;customerId&#125;/&#123;siteId&#125;/+</div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : 'Save & Connect'}
          </button>
          <button className="btn btn-ghost" onClick={handleDisconnect}>
            Disconnect
          </button>
        </div>
      </div>

      {/* ── Message Diagnostics ── */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Message Diagnostics</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Messages received</span>
          <span style={{
            fontSize: 24, fontWeight: 700,
            color: msgCount > 0 ? 'var(--success)' : 'var(--text-muted)',
          }}>{msgCount}</span>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            Subscribed topic
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: topicColor, wordBreak: 'break-all' }}>
            {status !== 'connected'
              ? '(not connected)'
              : (subscribedTopic ?? 'waiting...')}
          </div>
        </div>

        {lastTopic && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              Last topic
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text)', wordBreak: 'break-all', marginBottom: 8 }}>
              {lastTopic}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              Value
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text)' }}>
              {lastValue}
            </div>
          </div>
        )}

        {msgCount === 0 && status === 'connected' && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10 }}>
            No messages yet. Toggle a bit in RapidScada to test.
          </div>
        )}
      </div>

      {/* ── MQTT Topic Format ── */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>MQTT Topic Format</div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            App subscribes to
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', background: 'var(--surface2)', padding: '6px 10px', borderRadius: 6 }}>
            scada/&lt;customerId&gt;/&lt;siteId&gt;/+
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
            App → RapidScada (ACK / commands)
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text)', background: 'var(--surface2)', padding: '6px 10px', borderRadius: 6 }}>
            scada/&lt;customerId&gt;/&lt;siteId&gt;/Set_In_Ack_Pb
          </div>
        </div>
      </div>

    </div>
  );
}
