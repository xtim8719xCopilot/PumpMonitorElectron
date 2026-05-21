import { create } from 'zustand';

/**
 * How long (ms) without any MQTT message before SCADA→EMQX is considered disconnected.
 * RS6 publishes a SCADA_Heartbeat (ch135) every ~30 s, so 75 s gives a comfortable
 * 2.5× margin — enough for one missed heartbeat — before declaring a fault.
 */
export const SCADA_STALE_MS = 75_000;

/**
 * Stores every raw MQTT tag value received, keyed by siteId then tagName.
 * Also tracks the last time any message arrived per site for connectivity monitoring.
 */
interface SiteStoreState {
  tags: Record<string, Record<string, number>>;
  /** Unix timestamp (ms) of the last MQTT message received for each siteId. */
  lastMessageAt: Record<string, number>;
  updateTag: (siteId: string, tagName: string, value: number, isRetained?: boolean) => void;
  /** Bump lastMessageAt without storing a tag value (used for NaN/undefined payloads). */
  touchSite: (siteId: string) => void;
  getTag: (siteId: string, tagName: string, defaultVal?: number) => number;
  getLastMessageAt: (siteId: string) => number | null;
  getSites: () => string[];
}

export const useSiteStore = create<SiteStoreState>((set, get) => ({
  tags: {},
  lastMessageAt: {},

  updateTag: (siteId, tagName, value, isRetained = false) => {
    set((state) => ({
      tags: {
        ...state.tags,
        [siteId]: { ...(state.tags[siteId] ?? {}), [tagName]: value },
      },
      // Only advance the liveness timestamp for non-retained messages.
      // Retained messages are broker-cached values and don't prove SCADA is live.
      lastMessageAt: isRetained
        ? state.lastMessageAt
        : { ...state.lastMessageAt, [siteId]: Date.now() },
    }));
  },

  touchSite: (siteId) => {
    set((state) => ({
      // Ensure the siteId key exists in tags so the dashboard shows the site card
      // even when all payloads are NaN (PLC offline, RS6 publishes undefined values).
      tags: state.tags[siteId]
        ? state.tags
        : { ...state.tags, [siteId]: {} },
      lastMessageAt: {
        ...state.lastMessageAt,
        [siteId]: Date.now(),
      },
    }));
  },

  getTag: (siteId, tagName, defaultVal = 0) =>
    get().tags[siteId]?.[tagName] ?? defaultVal,

  getLastMessageAt: (siteId) =>
    get().lastMessageAt[siteId] ?? null,

  getSites: () => Object.keys(get().tags).sort(),
}));

// Float tag names in order from bottom to top of the wet well
export const FLOAT_TAGS = [
  { tag: 'In_LowLevelAlarmFloat', label: 'Low Alarm',  color: '#ef4444' },
  { tag: 'In_OffFloat',           label: 'Off',         color: '#94a3b8' },
  { tag: 'In_LeadFloat',          label: 'Lead On',     color: '#3b82f6' },
  { tag: 'In_LagFloat',           label: 'Lag On',      color: '#8b5cf6' },
  { tag: 'In_HighLevelFloat',     label: 'High Level',  color: '#f59e0b' },
] as const;
