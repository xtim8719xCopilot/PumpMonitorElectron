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
        <div style={{ fontSize: 48, marginBottom: 8 }}>💧</div>
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

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '4px 0',
};
