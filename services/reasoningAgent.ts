import { IntelligenceAnalysis, OsintNewsItem, Sitrep } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

interface AnalyzeRequest {
  sitrep: Sitrep;
  rawOsint: OsintNewsItem[];
}

export class ReasoningAgent {
  async analyze(payload: AnalyzeRequest): Promise<IntelligenceAnalysis> {
    const res = await fetch(`${API_BASE}/api/intel/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Strategic analysis uplink failed (${res.status})`);
    }

    return res.json();
  }
}

export const reasoningAgent = new ReasoningAgent();
