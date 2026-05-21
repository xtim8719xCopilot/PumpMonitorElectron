import React, { useEffect, useState } from 'react';
import { usePumpStore } from '../store/usePumpStore';
import { useSiteStore, SCADA_STALE_MS } from '../store/useSiteStore';
import { PumpRunTime, DEFAULT_PUMP_RUNTIME } from '../constants/topics';
import { PLC_COMM_TAG } from '../constants/topics';

const PERIODS: { key: keyof PumpRunTime; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week',  label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
  { key: 'total', label: 'Lifetime Total' },
];

function fmtHours(h: number): string {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return `${hrs}h ${mins}m`;
}

function msToAge(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export default function RuntimeScreen() {
  const getSites        = useSiteStore((s) => s.getSites);
  const lastMessageAt   = useSiteStore((s) => s.lastMessageAt);
  const siteTagMap      = useSiteStore((s) => s.tags);
  const getPumpsForSite = usePumpStore((s) => s.getPumpsForSite);
  const sites           = getSites();

  // Tick every 10 s so staleness detection updates without a new message
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  if (sites.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Runtime Data</h3>
        <p>Runtime hours will appear here once RapidScada starts publishing runtime channels (136–145).</p>
      </div>
    );
  }

  return (
    <div>
      {sites.map((siteId) => {
        const pumps = getPumpsForSite(siteId);
        const tags  = siteTagMap[siteId] ?? {};

        const lastAt = lastMessageAt[siteId] ?? null;
        const age    = lastAt ? now - lastAt : Infinity;

        const scadaOk = lastAt !== null && age < SCADA_STALE_MS;
        const plcRaw  = tags[PLC_COMM_TAG];
        // Only trust PLC status when SCADA is live
        const plcOk   = scadaOk ? (plcRaw === undefined || plcRaw !== 0) : false;
        const dataValid = scadaOk && plcOk;

        return (
          <div key={siteId} className="card" style={{ marginBottom: 16 }}>
            <div className="site-header" style={{ marginBottom: 12 }}>
              <span className="site-name">{siteId}</span>
            </div>

            {!dataValid ? (
              <div style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: lastAt === null ? 'var(--surface2)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${lastAt === null ? 'var(--border)' : 'rgba(239,68,68,0.25)'}`,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>{lastAt === null ? '⏳' : '⚠️'}</span>
                <div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginBottom: 2,
                    color: lastAt === null ? 'var(--text-muted)' : 'var(--danger)',
                  }}>
                    {lastAt === null
                      ? 'Waiting for SCADA'
                      : !scadaOk
                        ? `SCADA Offline · last seen ${msToAge(age)}`
                        : 'PLC Offline'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Runtime data is hidden while the site is offline.
                  </div>
                </div>
              </div>
            ) : (
              pumps.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>No pump data received yet.</p>
              ) : (
                pumps.map((pump) => {
                  const rt = pump.runTime ?? DEFAULT_PUMP_RUNTIME;
                  return (
                    <div key={pump.pumpId} style={{ marginBottom: 20 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
                        {pump.pumpId.replace('pump-', 'Pump ')}
                      </div>
                      <table className="runtime-table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Runtime</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PERIODS.map(({ key, label }) => (
                            <tr key={key}>
                              <td className="period-label">{label}</td>
                              <td className="runtime-val">{fmtHours(rt[key])}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
