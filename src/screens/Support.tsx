import React from 'react';
import { IoCallOutline, IoMailOutline } from 'react-icons/io5';

const PHONE = '(304) 915-4680';
const PHONE_TEL = '3049154680';
const EMAIL = 'Kevin@CaldwellPumps.com';

export default function SupportScreen() {
  function openPhone() {
    window.open(`tel:${PHONE_TEL}`);
  }
  function openEmail() {
    window.open(`mailto:${EMAIL}`);
  }

  return (
    <div style={{ maxWidth: 520 }}>

      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, marginTop: 8 }}>
        <PumpLogo />

        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '0.02em', color: 'var(--text)' }}>
          Caldwell Pump Services
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
          We're here to help. Reach out any time.
        </div>
      </div>

      {/* Contact card */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Contact Us</div>

        {/* Phone */}
        <div style={rowStyle}>
          <IoCallOutline size={22} color="var(--primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Phone
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>
              {PHONE}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openPhone}>
            Call
          </button>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', margin: '10px 0' }} />

        {/* Email */}
        <div style={rowStyle}>
          <IoMailOutline size={22} color="var(--primary)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Email
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)', marginTop: 2 }}>
              {EMAIL}
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={openEmail}>
            Email
          </button>
        </div>
      </div>

      {/* About card */}
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>About PumpWatch</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: 10 }}>
          PumpWatch is a real-time pump station monitoring application developed by Caldwell Pump
          Services LLC. It connects securely to your EMQX broker over WSS/TLS to deliver live
          pump status, wet-well levels, and alarm notifications.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>
          For installation assistance, broker configuration, or questions about your monitoring
          system, please contact us using the details above.
        </p>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
        © 2025 Caldwell Pump Services LLC · All rights reserved
      </div>
    </div>
  );
}

function PumpLogo() {
  const BODY    = '#8fa3b8';
  const BODY_DK = '#64748b';
  const BODY_HI = '#a8bfcf';
  const INK     = '#1e293b';
  const SW      = 3.5;
  const VANES   = [0, 60, 120, 180, 240, 300];

  return (
    <svg viewBox="0 0 100 130" width={72} height={94} xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 8 }}>
      <rect x="41" y="102" width="18" height="26" fill={BODY} />
      <circle cx="50" cy="74" r="38" fill={BODY} stroke={INK} strokeWidth={SW} />
      <circle cx="50" cy="74" r="36" fill="none" stroke={BODY_HI} strokeWidth={2}
        strokeDasharray="40 160" strokeDashoffset="100" />
      <circle cx="50" cy="74" r="29" fill={BODY_DK} />
      <circle cx="50" cy="74" r="22.5" fill="#1d6ef5" />
      {VANES.map((angle) => (
        <rect key={angle} x="47" y="56" width="6" height="11" rx="2.5"
          fill="#93c5fd" opacity={0.95} transform={`rotate(${angle}, 50, 74)`} />
      ))}
      <circle cx="50" cy="74" r="8"   fill="#1e3a8a" />
      <circle cx="50" cy="74" r="4"   fill={INK} />
      <circle cx="50" cy="74" r="2"   fill="#bfdbfe" />
      <circle cx="50" cy="74" r="29" fill="none" stroke={INK} strokeWidth={2} />
      <circle cx="50" cy="74" r="38" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="41" y="102" width="18" height="18" rx="2" fill="none" stroke={INK} strokeWidth={SW} />
      <rect x="32" y="118" width="36" height="10" rx="4" fill={BODY} stroke={INK} strokeWidth={SW} />
      <rect x="41" y="14" width="18" height="34" rx="2" fill={BODY} stroke={INK} strokeWidth={SW} />
      <rect x="32" y="4" width="36" height="10" rx="4" fill={BODY} stroke={INK} strokeWidth={SW} />
    </svg>
  );
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '4px 0',
};
