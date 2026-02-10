import { create } from 'zustand';
import { IntelligenceAnalysis, ProphetNode, Sitrep, ThreatLevel } from '../types';
import { TEMPORAL_END_UTC } from '../services/temporal';

interface IntelligenceStore {
  temporalDate: Date;
  sitreps: Sitrep[];
  analyses: Record<string, IntelligenceAnalysis>;
  prophetNodes: ProphetNode[];
  isAnalyzing: boolean;
  isSearching: boolean;
  isBackgroundRunning: boolean;
  uplinkLatencyMs: number;
  lastBackgroundPollAt?: string;
  setTemporalDate: (date: Date) => void;
  setSearching: (value: boolean) => void;
  setAnalyzing: (value: boolean) => void;
  setUplinkLatency: (value: number) => void;
  setBackgroundRunning: (value: boolean) => void;
  setInitialSitreps: (sitreps: Sitrep[]) => void;
  mergeSitreps: (incoming: Sitrep[]) => void;
  putAnalysis: (sitrepId: string, analysis: IntelligenceAnalysis) => void;
  setProphetNodes: (nodes: ProphetNode[]) => void;
  markBackgroundPoll: () => void;
}

const dedupeById = (items: Sitrep[]) => {
  const map = new Map<string, Sitrep>();
  const coordSet = new Set<string>();
  for (const item of items) {
    const coordKey = `${item.coordinates[0].toFixed(3)},${item.coordinates[1].toFixed(3)}`;
    if (coordSet.has(coordKey)) {
      continue;
    }
    coordSet.add(coordKey);

    const firstRaw = item.rawOsint?.[0];
    const signature = firstRaw
      ? `${firstRaw.link}|${firstRaw.title.toLowerCase()}|${firstRaw.source.toLowerCase()}`
      : `${item.id}|${coordKey}`;
    map.set(signature, item);
  }
  return Array.from(map.values());
};

const toThreatLevel = (riskScore: number): ThreatLevel => {
  if (riskScore >= 85) return ThreatLevel.CRITICAL;
  if (riskScore >= 60) return ThreatLevel.HIGH;
  if (riskScore >= 30) return ThreatLevel.MEDIUM;
  return ThreatLevel.LOW;
};

export const useIntelligenceStore = create<IntelligenceStore>((set, get) => ({
  temporalDate: TEMPORAL_END_UTC,
  sitreps: [],
  analyses: {},
  prophetNodes: [],
  isAnalyzing: false,
  isSearching: false,
  isBackgroundRunning: false,
  uplinkLatencyMs: 0,
  setTemporalDate: (date) => set({ temporalDate: date }),
  setSearching: (value) => set({ isSearching: value }),
  setAnalyzing: (value) => set({ isAnalyzing: value }),
  setUplinkLatency: (value) => set({ uplinkLatencyMs: value }),
  setBackgroundRunning: (value) => set({ isBackgroundRunning: value }),
  setInitialSitreps: (sitreps) => set({ sitreps }),
  mergeSitreps: (incoming) => {
    const combined = [...incoming, ...get().sitreps];
    set({ sitreps: dedupeById(combined) });
  },
  putAnalysis: (sitrepId, analysis) => {
    const sitreps = get().sitreps.map((sitrep) => {
      if (sitrep.id !== sitrepId) return sitrep;

      const actorEntities = [
        ...analysis.actors.state,
        ...analysis.actors.nonState,
      ];

      return {
        ...sitrep,
        riskScore: analysis.riskScore,
        threatLevel: toThreatLevel(analysis.riskScore),
        entities: {
          people: sitrep.entities.people,
          places: sitrep.entities.places,
          orgs: Array.from(new Set([...sitrep.entities.orgs, ...actorEntities])),
        },
      };
    });

    set({
      analyses: { ...get().analyses, [sitrepId]: analysis },
      sitreps,
    });
  },
  setProphetNodes: (nodes) => set({ prophetNodes: nodes }),
  markBackgroundPoll: () => set({ lastBackgroundPollAt: new Date().toISOString() }),
}));
