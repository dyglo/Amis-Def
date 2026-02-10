import { intelligenceService } from '../services/intelligenceService';
import { useIntelligenceStore } from '../store/intelligenceStore';
import { OsintNewsItem, Sitrep, ThreatLevel } from '../types';

interface HandshakePayload {
  sitreps: Sitrep[];
  raw: OsintNewsItem[];
  temporalDate: Date;
}

export const runMultiAgentHandshake = async ({ sitreps, raw, temporalDate }: HandshakePayload) => {
  const setProphetNodes = useIntelligenceStore.getState().setProphetNodes;
  const mergeSitreps = useIntelligenceStore.getState().mergeSitreps;

  if (sitreps.length === 0 || raw.length === 0) {
    return;
  }

  try {
    const prophet = await intelligenceService.runProphet(raw, temporalDate);
    setProphetNodes(prophet.prophetNodes);

    const prophetAsSitreps = prophet.prophetNodes.map((node) => ({
      id: node.id,
      title: `Prophet: ${node.title}`,
      coordinates: node.coordinates,
      timestamp: node.timestamp,
      threatLevel: node.confidence >= 70 ? ThreatLevel.HIGH : ThreatLevel.MEDIUM,
      description: node.probabilityAnalysis,
      category: 'POLITICAL',
      entities: {
        people: [],
        places: [],
        orgs: ['ProphetAgent'],
      },
      isProphetNode: true,
      probabilityAnalysis: node.probabilityAnalysis,
      leadingIndicators: node.leadingIndicators,
      riskScore: node.confidence,
      isNew: true,
      rawOsint: [],
    }));
    mergeSitreps(prophetAsSitreps);
  } catch (error) {
    // Keep handshake failures non-fatal for primary ingestion.
    console.error('Prophet handshake failed:', error);
  }
};
