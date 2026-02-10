import { reasoningAgent } from './reasoningAgent';
import { searchAgent } from './searchAgent';
import { serperTimePeriodFromDate, toIsoDay } from './temporal';
import { Sitrep } from '../types';
import { prophetAgent } from './prophetAgent';

export class IntelligenceService {
  async searchNewIntelligence(
    query: string,
    temporalDate: Date,
    maxNodes: number = 20,
    regions?: string[],
    includeGlobalHotspots: boolean = false
  ) {
    const range = {
      startDate: '2020-01-01',
      endDate: toIsoDay(temporalDate),
    };

    const result = await searchAgent.search({
      query,
      temporalDate: toIsoDay(temporalDate),
      timePeriod: serperTimePeriodFromDate(),
      startDate: range.startDate,
      endDate: range.endDate,
      maxNodes,
      regions,
      includeGlobalHotspots,
    });

    return result;
  }

  async analyzeSitrep(sitrep: Sitrep) {
    const rawOsint = sitrep.rawOsint || [];
    return reasoningAgent.analyze({ sitrep, rawOsint });
  }

  async runProphet(osintBatch: Array<{
    title: string;
    snippet: string;
    source: string;
    link: string;
    publishedAt?: string;
  }>, temporalDate: Date) {
    return prophetAgent.predict({
      osintBatch,
      temporalDate: toIsoDay(temporalDate),
    });
  }
}

export const intelligenceService = new IntelligenceService();
