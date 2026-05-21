import React, { useEffect, useState } from 'react';
import { mqttService } from '../services/mqttService';
import { ConnectionStatus } from '../types';

const LABELS: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
  error: 'Error',
};

export default function ConnectionBadge() {
  const [status, setStatus] = useState<ConnectionStatus>(mqttService.getStatus());

  useEffect(() => {
    const unsub = mqttService.onStatusChange(setStatus);
    return unsub;
  }, []);

  const isPulsing = status === 'connecting';

  return (
    <span className={`conn-badge ${status}`}>
      <span className={`conn-dot ${isPulsing ? 'pulse' : ''}`} />
      {LABELS[status]}
    </span>
  );
}
