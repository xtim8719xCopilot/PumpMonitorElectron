import { AlarmSeverity } from '../types';

// Topic format: scada/{customerId}/{siteId}/{tagName}
// Payload: plain numeric string e.g. "0", "1", "0.000", "1.000"
// customerId groups all sites belonging to one customer (used for EMQX ACL).
// siteId identifies the individual pump station within that customer.

export function tagTopic(customerId: string, siteId: string, tagName: string): string {
  return `scada/${customerId}/${siteId}/${tagName}`;
}

/** Parses a topic into customerId + siteId + tagName. Returns null if it doesn't match. */
export function parseTopic(topic: string): { customerId: string; siteId: string; tagName: string } | null {
  const parts = topic.split('/');
  if (parts.length !== 4 || parts[0] !== 'scada') return null;
  return { customerId: parts[1], siteId: parts[2], tagName: parts[3] };
}

// ---------------------------------------------------------------------------
// Pump tag mappings
// ---------------------------------------------------------------------------

/** tagName → pump number (1-based) */
export const PUMP_RUN_TAGS: Record<string, number> = {
  Out_PumpRun_1: 1,
  Out_PumpRun_2: 2,
};

export const PUMP_FAIL_TAGS: Record<string, number> = {
  Out_PumpFail_1: 1,
  Out_PumpFail_2: 2,
};

export const PUMP_READY_TAGS: Record<string, number> = {
  In_Pump1Ready: 1,
  In_Pump2Ready: 2,
};

export const PUMP_ENABLE_TAGS: Record<string, number> = {
  Enable_Pump1: 1,
  Enable_Pump2: 2,
};

// ---------------------------------------------------------------------------
// Alarm tag mappings
// ---------------------------------------------------------------------------

export interface AlarmTagMeta {
  message: string;
  severity: AlarmSeverity;
  /** If true, value=0 triggers the alarm (normally-closed logic). Default false (value=1 triggers). */
  invertLogic?: boolean;
}

export const ALARM_TAGS: Record<string, AlarmTagMeta> = {
  Out_PumpFail_1:       { message: 'Pump 1 Fault',       severity: 'critical' },
  Out_PumpFail_2:       { message: 'Pump 2 Fault',       severity: 'critical' },
  Out_HighLevelAlarm:   { message: 'High Level Alarm',   severity: 'critical' },
  Out_LocalAlarm:       { message: 'Local Alarm',        severity: 'warning' },
  In_LowLevelAlarmFloat:{ message: 'Low Level Alarm',    severity: 'warning' },
  In_PhaseMonitor:      { message: 'Phase Monitor Fault', severity: 'critical', invertLogic: true },
};

// ---------------------------------------------------------------------------
// Connectivity monitoring tags (RapidScada → app)
// ---------------------------------------------------------------------------

/**
 * Tag published by RapidScada indicating whether the PLC is communicating.
 * Value: 1 = PLC connected, 0 = PLC communication lost.
 *
 * Configure in RapidScada: bind your OPC/Modbus channel status to this tag
 * and include it in the MQTT publisher device.
 */
export const PLC_COMM_TAG = 'In_PLC_CommOK';

/**
 * Heartbeat tag published by RapidScada every ~30 s (RS6 channel 135).
 * Value: UnixTime()/30 — an integer that increments every 30 seconds.
 * Received by the app purely to prove SCADA→EMQX is alive; not displayed.
 * Its value is NOT stored in the site tag map — only lastMessageAt is bumped.
 */
export const SCADA_HEARTBEAT_TAG = 'SCADA_Heartbeat';

// ---------------------------------------------------------------------------
// Write-back (app → RapidScada) tags
// ---------------------------------------------------------------------------

/** Tag to publish when user acknowledges alarms. Value: "1" */
export const ACK_TAG = 'Set_In_Ack_Pb';

export const SET_TAGS = {
  ack:           'Set_In_Ack_Pb',
  enablePump1:   'Set_Enable_Pump1',
  enablePump2:   'Set_Enable_Pump2',
  stopAll:       'Set_Out_PumpStop_All',
  silenceAlarm:  'Set_Alarm_Silenced',
};

// ---------------------------------------------------------------------------
// Run-time tracking tags (RS6 calculated channels → MQTT → app)
// ---------------------------------------------------------------------------

export interface PumpRunTime {
  today: number;   // hours (decimal)
  week: number;
  month: number;
  year: number;
  total: number;
}

export const DEFAULT_PUMP_RUNTIME: PumpRunTime = {
  today: 0, week: 0, month: 0, year: 0, total: 0,
};

/** MQTT tag name → pump number + period key */
export const PUMP_RUNTIME_TAGS: Record<string, { pump: number; period: keyof PumpRunTime }> = {
  Pump1_RunTime_Today:  { pump: 1, period: 'today' },
  Pump1_RunTime_Week:   { pump: 1, period: 'week' },
  Pump1_RunTime_Month:  { pump: 1, period: 'month' },
  Pump1_RunTime_Year:   { pump: 1, period: 'year' },
  Pump1_RunTime_Total:  { pump: 1, period: 'total' },
  Pump2_RunTime_Today:  { pump: 2, period: 'today' },
  Pump2_RunTime_Week:   { pump: 2, period: 'week' },
  Pump2_RunTime_Month:  { pump: 2, period: 'month' },
  Pump2_RunTime_Year:   { pump: 2, period: 'year' },
  Pump2_RunTime_Total:  { pump: 2, period: 'total' },
};
