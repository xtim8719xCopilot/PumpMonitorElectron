import React, { useEffect, useMemo, useState } from 'react';
import { useSiteStore, FLOAT_TAGS, SCADA_STALE_MS } from '../store/useSiteStore';
import { usePumpStore } from '../store/usePumpStore';
import { mqttService } from '../services/mqttService';
import { MqttConfig, Pump } from '../types';
import { getItem } from '../utils/storage';
import { PLC_COMM_TAG } from '../constants/topics';

const STORAGE_KEY = 'mqtt_config';

type ConnState = 'ok' | 'fault' | 'unknown';

function msToAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins}m`;
}

// ---------------------------------------------------------------------------

export default function Dashboard() {
  const siteTagMap  = useSiteStore((s) => s.tags);
  const lastMessageAt = useSiteStore((s) => s.lastMessageAt);
  const getPumpsForSite = usePumpStore((s) => s.getPumpsForSite);
  const sites = useMemo(() => Object.keys(siteTagMap).sort(), [siteTagMap]);

  // Tick every 10 s so staleness detection updates without a new message
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mqttService.getStatus() !== 'disconnected') return;
    getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const cfg: MqttConfig = JSON.parse(raw);
        if (cfg.host && cfg.username && cfg.customerId && Array.isArray(cfg.siteIds) && cfg.siteIds.length > 0) {
          mqttService.connect(cfg);
        }
      } catch {}
    });
  }, []);

  if (sites.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Sites Yet</h3>
        <p>Waiting for data from RapidScada. Configure your broker in Settings, then data will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div>
      {sites.map((siteId) => (
        <SiteCard
          key={siteId}
          siteId={siteId}
          pumps={getPumpsForSite(siteId)}
          tags={siteTagMap[siteId] ?? {}}
          lastMessageAt={lastMessageAt[siteId] ?? null}
          now={now}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SiteCard({ siteId, pumps, tags, lastMessageAt, now }: {
  siteId: string;
  pumps: Pump[];
  tags: Record<string, number>;
  lastMessageAt: number | null;
  now: number;
}) {
  const age = lastMessageAt ? now - lastMessageAt : Infinity;

  // SCADA → EMQX: derived from message staleness
  const scadaState: ConnState = lastMessageAt === null
    ? 'unknown'
    : age < SCADA_STALE_MS ? 'ok' : 'fault';

  // PLC → SCADA: only meaningful when SCADA itself is confirmed live.
  // If SCADA is stale/unknown, the retained In_PLC_CommOK value in the store
  // cannot be trusted — we have no live channel to the field.
  const plcRaw = tags[PLC_COMM_TAG];
  const plcStateRaw: ConnState = plcRaw === undefined
    ? 'unknown'
    : plcRaw !== 0 ? 'ok' : 'fault';
  const plcState: ConnState = scadaState === 'ok' ? plcStateRaw : 'unknown';

  // Site is "data-valid" only when SCADA is live AND PLC is not explicitly offline
  const scadaOnline = scadaState === 'ok';
  const plcOnline   = plcState !== 'fault';   // ok or unknown → show data
  const dataValid   = scadaOnline && plcOnline;

  return (
    <div className="card site-card">
      {/* Header */}
      <div className="site-header">
        <span className="site-name">{siteId}</span>
      </div>

      {/* Connectivity indicator — always visible */}
      <ConnectivityRow
        scadaState={scadaState}
        plcState={plcState}
        lastMessageAt={lastMessageAt}
        now={now}
      />

      {/* Body — only rendered when data is valid */}
      {dataValid ? (
        <>
          <div className="pump-grid" style={{ marginTop: 12 }}>
            {pumps.length === 0
              ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pump data received yet</span>
              : pumps.map((pump) => <PumpCard key={pump.pumpId} pump={pump} />)}
          </div>
          <FloatsStrip tags={tags} />
        </>
      ) : (
        <OfflineBanner scadaState={scadaState} plcState={plcState} age={age} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ConnectivityRow({ scadaState, plcState, lastMessageAt, now }: {
  scadaState: ConnState;
  plcState: ConnState;
  lastMessageAt: number | null;
  now: number;
}) {
  const DOT_COLOR: Record<ConnState, string> = {
    ok:      'var(--success)',
    fault:   'var(--danger)',
    unknown: 'var(--text-muted)',
  };

  const age = lastMessageAt ? msToAge(now - lastMessageAt) : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 6 }}>
      {/* SCADA dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: DOT_COLOR[scadaState],
          boxShadow: scadaState === 'ok' ? `0 0 5px ${DOT_COLOR[scadaState]}` : undefined,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
          SCADA
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: DOT_COLOR[scadaState], marginLeft: 2 }}>
          {scadaState === 'ok' ? 'OK' : scadaState === 'fault' ? 'Offline' : '—'}
        </span>
        {age && scadaState === 'ok' && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 2 }}>· {age}</span>
        )}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 12, background: 'var(--border)', margin: '0 10px' }} />

      {/* PLC dot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: DOT_COLOR[plcState],
          boxShadow: plcState === 'ok' ? `0 0 5px ${DOT_COLOR[plcState]}` : undefined,
        }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
          PLC
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: DOT_COLOR[plcState], marginLeft: 2 }}>
          {plcState === 'ok' ? 'OK' : plcState === 'fault' ? 'Offline' : '—'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function OfflineBanner({ scadaState, plcState, age }: {
  scadaState: ConnState;
  plcState: ConnState;
  age: number;
}) {
  let title: string;
  let detail: string;

  if (scadaState === 'fault') {
    title = 'SCADA Offline';
    detail = age < Infinity
      ? `No data received for ${msToAge(age)}. Check SCADA server and network connection.`
      : 'No data received. Check SCADA server and network connection.';
  } else if (scadaState === 'unknown') {
    title = 'Waiting for SCADA';
    detail = 'No messages received yet. Check broker settings and RapidScada connection.';
  } else {
    // scada ok but plc fault
    title = 'PLC Offline';
    detail = 'PLC communication lost. SCADA is running but not receiving data from the PLC — check field wiring and Modbus connection.';
  }

  const isWaiting = scadaState === 'unknown';

  return (
    <div style={{
      marginTop: 14,
      padding: '12px 14px',
      borderRadius: 8,
      background: isWaiting ? 'var(--surface2)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${isWaiting ? 'var(--border)' : 'rgba(239,68,68,0.25)'}`,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.2 }}>{isWaiting ? '⏳' : '⚠️'}</span>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 700,
          color: isWaiting ? 'var(--text-muted)' : 'var(--danger)',
          marginBottom: 3,
        }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {detail}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PumpCard({ pump }: { pump: Pump }) {
  const label = pump.status.charAt(0).toUpperCase() + pump.status.slice(1);
  return (
    <div className="pump-card">
      <div className="pump-card-header">
        <span className="pump-title">{pump.pumpId.replace('pump-', 'Pump ')}</span>
        <span className={`status-dot ${pump.status}`} />
      </div>
      <div className={`pump-status-label ${pump.status}`}>{label}</div>
      {pump.runTime && (
        <div className="pump-meta">
          <span>Today: {fmtHours(pump.runTime.today)}</span>
          <span>Total: {fmtHours(pump.runTime.total)}</span>
        </div>
      )}
    </div>
  );
}

function FloatsStrip({ tags }: { tags: Record<string, number> }) {
  return (
    <div className="floats-strip">
      {FLOAT_TAGS.map(({ tag, label, color }) => {
        const active = (tags[tag] ?? 0) !== 0;
        return (
          <span
            key={tag}
            className={`float-chip ${active ? 'active' : ''}`}
            style={{ color, borderColor: color + '66', background: color + '18' }}
          >
            {active ? '●' : '○'} {label}
          </span>
        );
      })}
    </div>
  );
}
