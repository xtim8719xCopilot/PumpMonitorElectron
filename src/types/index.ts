export type PumpStatus = 'running' | 'stopped' | 'fault' | 'unknown';

export type AlarmSeverity = 'critical' | 'warning' | 'info';

export type { PumpRunTime } from '../constants/topics';

import type { PumpRunTime } from '../constants/topics';

export interface Pump {
  siteId: string;
  pumpId: string;
  status: PumpStatus;
  rpm?: number;
  lastUpdated: string;
  runTime?: PumpRunTime;
}

export interface Alarm {
  id: string; // composite: `${siteId}/${alarmId}`
  siteId: string;
  alarmId: string;
  message: string;
  severity: AlarmSeverity;
  active: boolean;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface MqttConfig {
  host: string;     // e.g. abc123.emqxsl.com
  port: number;     // 8084 (EMQX Cloud WSS/TLS)
  username: string;
  password: string;
  clientId: string;    // unique per device session
  customerId: string;  // e.g. "customer1" — top-level namespace, used for EMQX ACL
  siteIds: string[];   // e.g. ["site-001"] — subscribes to scada/{customerId}/{siteId}/+ for each
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
