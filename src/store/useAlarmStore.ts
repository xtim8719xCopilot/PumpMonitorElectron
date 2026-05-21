import { create } from 'zustand';
import { Alarm } from '../types';
import { ALARM_TAGS } from '../constants/topics';

interface AlarmState {
  alarms: Alarm[];
  history: Alarm[];
  updateFromTag: (siteId: string, tagName: string, value: number) => void;
  acknowledgeAlarm: (id: string, acknowledgedBy: string) => void;
  getActiveUnacknowledged: () => Alarm[];
  getActive: () => Alarm[];
  getAcknowledged: () => Alarm[];
}

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

function sortAlarms(alarms: Alarm[]): Alarm[] {
  return [...alarms].sort((a, b) => {
    const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sev !== 0) return sev;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

const HISTORY_LIMIT = 50;

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  history: [],

  updateFromTag: (siteId: string, tagName: string, value: number) => {
    const meta = ALARM_TAGS[tagName];
    if (!meta) return;

    const isActive = meta.invertLogic ? value === 0 : value !== 0;
    const id = `${siteId}/${tagName}`;

    set((state) => {
      const existing = state.alarms.find((a) => a.id === id);

      if (!isActive) {
        // Alarm cleared — remove from active list but keep acknowledged ones for audit
        if (!existing) return state;
        const updated = state.alarms.map((a) =>
          a.id === id ? { ...a, active: false } : a
        );
        return { alarms: sortAlarms(updated) };
      }

      if (existing) {
        if (existing.active) {
          // Still active and already in the list — nothing to do
          return state;
        }
        // Alarm was cleared (active: false) and is now triggering again — treat as
        // a new occurrence: reset acknowledged state and update the timestamp.
        const newHistory = existing.acknowledged
          ? [existing, ...state.history].slice(0, HISTORY_LIMIT)
          : state.history;
        const updated = state.alarms.map((a) =>
          a.id === id
            ? { ...a, active: true, acknowledged: false, acknowledgedBy: undefined, acknowledgedAt: undefined, timestamp: new Date().toISOString() }
            : a
        );
        return { alarms: sortAlarms(updated), history: newHistory };
      }

      const newAlarm: Alarm = {
        id,
        siteId,
        alarmId: tagName,
        message: meta.message,
        severity: meta.severity,
        active: true,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      };
      return { alarms: sortAlarms([...state.alarms, newAlarm]) };
    });
  },

  acknowledgeAlarm: (id: string, acknowledgedBy: string) => {
    set((state) => ({
      alarms: state.alarms.map((a) =>
        a.id === id
          ? { ...a, acknowledged: true, acknowledgedBy, acknowledgedAt: new Date().toISOString() }
          : a
      ),
    }));
  },

  getActiveUnacknowledged: () =>
    get().alarms.filter((a) => a.active && !a.acknowledged),

  getActive: () =>
    get().alarms.filter((a) => a.active),

  getAcknowledged: () => {
    const { alarms, history } = get();
    const current = alarms.filter((a) => a.acknowledged);
    const combined = [...current, ...history];
    return combined.sort((a, b) =>
      new Date(b.acknowledgedAt ?? b.timestamp).getTime() -
      new Date(a.acknowledgedAt ?? a.timestamp).getTime()
    );
  },
}));
