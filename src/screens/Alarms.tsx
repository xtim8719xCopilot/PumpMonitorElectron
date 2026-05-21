import React, { useState, useCallback, useMemo } from 'react';
import { useAlarmStore } from '../store/useAlarmStore';
import { useSiteStore } from '../store/useSiteStore';
import { mqttService } from '../services/mqttService';
import { SET_TAGS } from '../constants/topics';
import { Alarm } from '../types';

type Tab = 'active' | 'acknowledged';

export default function AlarmsScreen() {
  const [tab, setTab] = useState<Tab>('active');
  const [ackTarget, setAckTarget] = useState<Alarm | null>(null);
  const [ackName, setAckName] = useState('');

  const acknowledgeAlarm = useAlarmStore((s) => s.acknowledgeAlarm);
  const getActive = useAlarmStore((s) => s.getActive);
  const getAcknowledged = useAlarmStore((s) => s.getAcknowledged);
  const siteTagMap = useSiteStore((s) => s.tags);

  const activeAlarms = getActive();
  const ackedAlarms = getAcknowledged();

  const sections = useMemo(() => {
    const map = new Map<string, Alarm[]>();
    for (const alarm of activeAlarms) {
      if (!map.has(alarm.siteId)) map.set(alarm.siteId, []);
      map.get(alarm.siteId)!.push(alarm);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [activeAlarms]);

  const confirmAck = useCallback(() => {
    if (!ackTarget || !ackName.trim()) return;
    const user = ackName.trim();
    acknowledgeAlarm(ackTarget.id, user);
    mqttService.publishTag(ackTarget.siteId, SET_TAGS.ack, 1);
    mqttService.publishCommand(ackTarget.siteId, {
      type: 'ack_alarm', alarmId: ackTarget.alarmId, message: ackTarget.message,
      severity: ackTarget.severity, user, timestamp: Date.now(),
    });
    setAckTarget(null);
    setAckName('');
  }, [ackTarget, ackName, acknowledgeAlarm]);

  const toggleSilence = useCallback((siteId: string) => {
    const silenced = siteTagMap[siteId]?.['Alarm_Silenced'] === 1;
    mqttService.publishTag(siteId, SET_TAGS.silenceAlarm, silenced ? 0 : 1);
  }, [siteTagMap]);

  return (
    <div>
      <div className="tab-bar">
        <button className={`tab-btn ${tab === 'active' ? 'active' : ''}`} onClick={() => setTab('active')}>
          Active ({activeAlarms.length})
        </button>
        <button className={`tab-btn ${tab === 'acknowledged' ? 'active' : ''}`} onClick={() => setTab('acknowledged')}>
          Acknowledged ({ackedAlarms.length})
        </button>
      </div>

      {tab === 'active' ? (
        sections.length === 0 ? (
          <div className="empty-state">
            <h3>No Active Alarms</h3>
            <p>All clear! Alarms from RapidScada will appear here.</p>
          </div>
        ) : (
          sections.map(([siteId, alarms]) => {
            const silenced = siteTagMap[siteId]?.['Alarm_Silenced'] === 1;
            return (
              <div key={siteId}>
                <div className="alarm-section-header">
                  <span className="alarm-site-name">{siteId}</span>
                  <button
                    className={`btn btn-sm btn-ghost`}
                    onClick={() => toggleSilence(siteId)}
                  >
                    {silenced ? '🔕 Silenced' : '🔔 Active'}
                  </button>
                </div>
                {alarms.map((alarm) => (
                  <AlarmRow key={alarm.id} alarm={alarm} onAcknowledge={setAckTarget} />
                ))}
              </div>
            );
          })
        )
      ) : (
        ackedAlarms.length === 0 ? (
          <div className="empty-state">
            <h3>No Acknowledged Alarms</h3>
            <p>Acknowledged alarms will appear here.</p>
          </div>
        ) : (
          ackedAlarms.map((alarm) => <AlarmRow key={alarm.id + alarm.acknowledgedAt} alarm={alarm} />)
        )
      )}

      {ackTarget && (
        <div className="modal-backdrop" onClick={() => setAckTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Acknowledge Alarm</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
              {ackTarget.message} — {ackTarget.siteId}
            </p>
            <div className="form-group">
              <label className="form-label">Your name</label>
              <input
                className="form-input"
                value={ackName}
                onChange={(e) => setAckName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && confirmAck()}
                autoFocus
                placeholder="Enter your name"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setAckTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmAck} disabled={!ackName.trim()}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AlarmRow({ alarm, onAcknowledge }: { alarm: Alarm; onAcknowledge?: (a: Alarm) => void }) {
  const ts = new Date(alarm.timestamp).toLocaleString();
  return (
    <div className="alarm-row">
      <div className={`alarm-severity ${alarm.severity}`} />
      <div className="alarm-body">
        <div className="alarm-message">{alarm.message}</div>
        <div className="alarm-meta">
          {alarm.siteId} · {ts}
          {alarm.acknowledged && alarm.acknowledgedBy && (
            <> · Acked by <strong>{alarm.acknowledgedBy}</strong></>
          )}
        </div>
      </div>
      {onAcknowledge && !alarm.acknowledged && (
        <button className="btn btn-sm btn-primary" onClick={() => onAcknowledge(alarm)}>
          Acknowledge
        </button>
      )}
    </div>
  );
}
