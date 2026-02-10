import { OsintNewsItem, Sitrep } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

export interface SearchResponse {
  sitreps: Sitrep[];
  center: [number, number];
  zoom: number;
  raw: OsintNewsItem[];
}

interface SearchRequest {
  query: string;
  temporalDate?: string;
  timePeriod: 'custom';
  startDate: string;
  endDate: string;
  maxNodes?: number;
  regions?: string[];
  includeGlobalHotspots?: boolean;
}

export class SearchAgent {
  async search(params: SearchRequest): Promise<SearchResponse> {
    const res = await fetch(`${API_BASE}/api/intel/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      throw new Error(`Search uplink failed (${res.status})`);
    }

    return res.json();
  }
}

export const searchAgent = new SearchAgent();
