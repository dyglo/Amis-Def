import { useCallback, useEffect, useRef } from 'react';
import { intelligenceService } from '../services/intelligenceService';
import { runMultiAgentHandshake } from '../agents/handshake';
import { useIntelligenceStore } from '../store/intelligenceStore';

const GLOBAL_REGIONS = [
  'Middle East',
  'Sahel',
  'Eastern Europe',
  'Southeast Asia',
  'Horn of Africa',
  'Latin America',
  'South Asia',
  'North America',
  'East Asia',
  'Oceania',
];

const HOTSPOT_QUERY = 'Armed Conflict OR Civil Unrest OR Cyber Warfare';

interface UseIntelligenceStreamOptions {
  intervalMs?: number;
  onPulse?: (count: number) => void;
}

export const useIntelligenceStream = ({
  intervalMs = 5 * 60 * 1000,
  onPulse,
}: UseIntelligenceStreamOptions = {}) => {
  const mergeSitreps = useIntelligenceStore((state) => state.mergeSitreps);
  const temporalDate = useIntelligenceStore((state) => state.temporalDate);
  const setBackgroundRunning = useIntelligenceStore((state) => state.setBackgroundRunning);
  const seenCoords = useRef<Set<string>>(new Set());
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  const fetchCycle = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      const result = await intelligenceService.searchNewIntelligence(
        HOTSPOT_QUERY,
        temporalDate,
        20,
        GLOBAL_REGIONS,
        true
      );

      const filtered = result.sitreps.filter((node) => {
        const key = `${node.coordinates[0].toFixed(3)},${node.coordinates[1].toFixed(3)}`;
        if (seenCoords.current.has(key)) {
          return false;
        }
        seenCoords.current.add(key);
        return true;
      });

      if (filtered.length > 0) {
        const merged = filtered.slice(0, 20).map((node) => ({ ...node, isNew: true }));
        mergeSitreps(merged);

        await runMultiAgentHandshake({
          sitreps: merged,
          raw: result.raw,
          temporalDate,
        });

        onPulse?.(merged.length);
      }
    } catch (error) {
      console.error('IntelligenceStream cycle failed:', error);
    } finally {
      runningRef.current = false;
    }
  }, [mergeSitreps, onPulse, temporalDate]);

  useEffect(() => {
    setBackgroundRunning(true);
    void fetchCycle();

    timerRef.current = window.setInterval(() => {
      void fetchCycle();
    }, intervalMs);

    return () => {
      setBackgroundRunning(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [fetchCycle, intervalMs, setBackgroundRunning]);

  return {
    regions: GLOBAL_REGIONS,
    hotspotQuery: HOTSPOT_QUERY,
  };
};
