import { create } from 'zustand';
import { Pump, PumpStatus } from '../types';
import { PUMP_RUN_TAGS, PUMP_FAIL_TAGS, PUMP_READY_TAGS, PUMP_ENABLE_TAGS, PUMP_RUNTIME_TAGS, DEFAULT_PUMP_RUNTIME } from '../constants/topics';

interface PumpRaw {
  run: boolean;
  fail: boolean;
  ready: boolean;
  enabled: boolean;
}

function deriveStatus(raw: PumpRaw): PumpStatus {
  if (raw.fail) return 'fault';
  if (raw.run) return 'running';
  return 'stopped';
}

const DEFAULT_RAW: PumpRaw = { run: false, fail: false, ready: false, enabled: false };

interface PumpState {
  pumps: Map<string, Pump>;
  /** Raw tag values per pump key `${siteId}/pump-${num}` */
  rawTags: Map<string, PumpRaw>;
  updateFromTag: (siteId: string, tagName: string, value: number) => void;
  getSites: () => string[];
  getPumpsForSite: (siteId: string) => Pump[];
}

function pumpKey(siteId: string, pumpNum: number): string {
  return `${siteId}/pump-${pumpNum}`;
}

export const usePumpStore = create<PumpState>((set, get) => ({
  pumps: new Map(),
  rawTags: new Map(),

  updateFromTag: (siteId: string, tagName: string, value: number) => {
    const active = value !== 0;
    let pumpNum: number | undefined;
    let field: keyof PumpRaw | undefined;

    if (PUMP_RUN_TAGS[tagName] !== undefined) {
      pumpNum = PUMP_RUN_TAGS[tagName];
      field = 'run';
    } else if (PUMP_FAIL_TAGS[tagName] !== undefined) {
      pumpNum = PUMP_FAIL_TAGS[tagName];
      field = 'fail';
    } else if (PUMP_READY_TAGS[tagName] !== undefined) {
      pumpNum = PUMP_READY_TAGS[tagName];
      field = 'ready';
    } else if (PUMP_ENABLE_TAGS[tagName] !== undefined) {
      pumpNum = PUMP_ENABLE_TAGS[tagName];
      field = 'enabled';
    }

    if (pumpNum === undefined || field === undefined) {
      // Check runtime tags before giving up
      const rtMeta = PUMP_RUNTIME_TAGS[tagName];
      if (rtMeta) {
        const key = pumpKey(siteId, rtMeta.pump);
        set((state) => {
          const existing = state.pumps.get(key);
          const pumps = new Map(state.pumps);
          pumps.set(key, {
            ...(existing ?? {
              siteId,
              pumpId: `pump-${rtMeta.pump}`,
              status: 'stopped' as const,
              lastUpdated: new Date().toISOString(),
              runTime: DEFAULT_PUMP_RUNTIME,
            }),
            runTime: {
              ...(existing?.runTime ?? DEFAULT_PUMP_RUNTIME),
              [rtMeta.period]: value,
            },
          });
          return { pumps };
        });
      }
      return;
    }

    const key = pumpKey(siteId, pumpNum);
    const pumpId = `pump-${pumpNum}`;

    set((state) => {
      const rawTags = new Map(state.rawTags);
      const current = rawTags.get(key) ?? { ...DEFAULT_RAW };
      const updated: PumpRaw = { ...current, [field!]: active };
      rawTags.set(key, updated);

      const pumps = new Map(state.pumps);
      const existingPump = pumps.get(key);
      pumps.set(key, {
        ...(existingPump ?? {}),
        siteId,
        pumpId,
        status: deriveStatus(updated),
        lastUpdated: new Date().toISOString(),
      });

      return { pumps, rawTags };
    });
  },

  getSites: () => {
    const siteIds = new Set<string>();
    get().pumps.forEach((p) => siteIds.add(p.siteId));
    return Array.from(siteIds).sort();
  },

  getPumpsForSite: (siteId: string) => {
    const result: Pump[] = [];
    get().pumps.forEach((p) => {
      if (p.siteId === siteId) result.push(p);
    });
    return result.sort((a, b) => a.pumpId.localeCompare(b.pumpId));
  },
}));
