import { intelligenceService } from '../services/intelligenceService';
import { useIntelligenceStore } from '../store/intelligenceStore';
import { runMultiAgentHandshake } from './handshake';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface IngestionAgentOptions {
  query: string;
  signal: AbortSignal;
  intervalMs: number;
  addLog: (msg: string) => void;
  onMapFocus: (center: [number, number], zoom: number) => void;
}

export const runIngestionAgent = async ({ query, signal, intervalMs, addLog, onMapFocus }: IngestionAgentOptions) => {
  const store = useIntelligenceStore.getState();
  store.setBackgroundRunning(true);

  while (!signal.aborted) {
    const start = performance.now();
    try {
      const temporalDate = useIntelligenceStore.getState().temporalDate;
      const result = await intelligenceService.searchNewIntelligence(query, temporalDate);

      const next = result.sitreps.map((s) => ({ ...s, isNew: true, rawOsint: result.raw }));
      useIntelligenceStore.getState().mergeSitreps(next);
      useIntelligenceStore.getState().markBackgroundPoll();

      if (next.length > 0) {
        addLog(`Pulse update: ${next.length} new conflict nodes detected.`);
        onMapFocus(result.center, result.zoom);
      }

      await runMultiAgentHandshake({
        sitreps: next,
        raw: result.raw,
        temporalDate,
      });

      useIntelligenceStore.getState().setUplinkLatency(Math.round(performance.now() - start));
    } catch (error) {
      addLog('Background ingestion degraded. Retrying on next cycle.');
      console.error(error);
    }

    await wait(intervalMs);
  }

  useIntelligenceStore.getState().setBackgroundRunning(false);
};
