import React from 'react';
import {
  IoSpeedometerOutline,
  IoWarningOutline,
  IoTimeOutline,
  IoSettingsOutline,
  IoHelpCircleOutline,
} from 'react-icons/io5';
import { Screen } from '../App';
import { useAlarmStore } from '../store/useAlarmStore';

interface Props { active: Screen; onNavigate: (s: Screen) => void; }

export default function Sidebar({ active, onNavigate }: Props) {
  const alarms = useAlarmStore((s) => s.alarms);
  const unackCount = alarms.filter((a) => a.active && !a.acknowledged).length;

  const NAV: { id: Screen; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <IoSpeedometerOutline size={18} /> },
    { id: 'alarms',    label: 'Alarms',    icon: <IoWarningOutline size={18} />, badge: unackCount },
    { id: 'runtime',   label: 'Runtime',   icon: <IoTimeOutline size={18} /> },
    { id: 'settings',  label: 'Settings',  icon: <IoSettingsOutline size={18} /> },
    { id: 'support',   label: 'Support',   icon: <IoHelpCircleOutline size={18} /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <PumpLogo />
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '0.02em' }}>
            Pump Monitor
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Desktop v1.0</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {NAV.map((item) => {
          const hasAlarm = item.id === 'alarms' && (item.badge ?? 0) > 0;
          return (
            <button
              key={item.id}
              className={`nav-item ${active === item.id ? 'active' : ''} ${hasAlarm && active !== item.id ? 'alarm-active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.icon}
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
              {(item.badge ?? 0) > 0 && (
                <span className={`alarm-badge ${active === item.id ? 'alarm-badge-selected' : ''}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

// ── Pump SVG logo (ported from mobile PumpIcon, static "running" state) ───────

function PumpLogo() {
  // Geometry constants matching PumpIcon.tsx
  const BODY    = '#8fa3b8';
  const BODY_DK = '#64748b';
  const BODY_HI = '#a8bfcf';
  const INK     = '#1e293b';
  const SW      = 3.5;

  // Vane angles
  const VANES = [0, 60, 120, 180, 240, 300];

  return (
    <svg
      viewBox="0 0 100 130"
      width={44}
      height={57}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Layer 1: Outlet pipe body (behind volute) ── */}
      <rect x="41" y="102" width="18" height="26" fill={BODY} />

      {/* ── Layer 2: Volute outer body ── */}
      <circle cx="50" cy="74" r="38" fill={BODY} stroke={INK} strokeWidth={SW} />
      {/* Highlight arc */}
      <circle cx="50" cy="74" r="36" fill="none" stroke={BODY_HI} strokeWidth={2}
        strokeDasharray="40 160" strokeDashoffset="100" />
      {/* Inner chamber */}
      <circle cx="50" cy="74" r="29" fill={BODY_DK} />

      {/* ── Layer 3: Impeller (running = blue) ── */}
      {/* Disc */}
      <circle cx="50" cy="74" r="22.5" fill="#1d6ef5" />
      {/* 6 vanes */}
      {VANES.map((angle) => (
        <rect
          key={angle}
          x="47" y="56"
          width="6" height="11"
          rx="2.5"
          fill="#93c5fd"
          opacity={0.95}
          transform={`rotate(${angle}, 50, 74)`}
        />
      ))}
      {/* Hub disc */}
      <circle cx="50" cy="74" r="8"   fill="#1e3a8a" />
      {/* Shaft boss */}
      <circle cx="50" cy="74" r="4"   fill={INK} />
      {/* Shaft highlight */}
      <circle cx="50" cy="74" r="2"   fill="#bfdbfe" />

      {/* ── Layer 4: Overlay (in front of impeller) ── */}
      {/* Inner chamber ring border */}
      <circle cx="50" cy="74" r="29" fill="none" stroke={INK} strokeWidth={2} />
      {/* Outer volute border */}
      <circle cx="50" cy="74" r="38" fill="none" stroke={INK} strokeWidth={SW} />

      {/* Outlet pipe outline */}
      <rect x="41" y="102" width="18" height="18" rx="2"
        fill="none" stroke={INK} strokeWidth={SW} />
      {/* Outlet cap */}
      <rect x="32" y="118" width="36" height="10" rx="4"
        fill={BODY} stroke={INK} strokeWidth={SW} />

      {/* Inlet pipe body (overlaps volute top) */}
      <rect x="41" y="14" width="18" height="34" rx="2"
        fill={BODY} stroke={INK} strokeWidth={SW} />
      {/* Inlet flange cap */}
      <rect x="32" y="4" width="36" height="10" rx="4"
        fill={BODY} stroke={INK} strokeWidth={SW} />
    </svg>
  );
}
