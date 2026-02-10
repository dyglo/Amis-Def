import { Sitrep, ThreatLevel } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

interface LiveNode {
  id: string;
  title: string;
  lat: number;
  lng: number;
  severity: ThreatLevel;
  sitrep: string;
  timestamp: string;
}

interface LiveIngestionResponse {
  nodes: LiveNode[];
  raw: Array<{
    title: string;
    snippet: string;
    source: string;
    date?: string;
    link?: string;
    queryDateContext?: string;
  }>;
}

const toCategory = (text: string): Sitrep['category'] => {
  const normalized = text.toLowerCase();
  if (normalized.includes('cyber') || normalized.includes('hack')) return 'CYBER';
  if (normalized.includes('naval') || normalized.includes('sea') || normalized.includes('maritime')) return 'MARITIME';
  if (normalized.includes('election') || normalized.includes('diplomatic') || normalized.includes('sanction')) return 'POLITICAL';
  return 'CONFLICT';
};

export const fetchGlobalConflictNews = async (): Promise<LiveIngestionResponse> => {
  const res = await fetch(`${API_BASE}/api/intel/live`);
  if (!res.ok) {
    throw new Error(`Live ingestion uplink failed (${res.status})`);
  }
  return res.json();
};

export const toSitrepsFromLiveNodes = (
  nodes: LiveNode[],
  raw: LiveIngestionResponse['raw']
): Sitrep[] =>
  nodes.map((node, idx) => ({
    id: node.id || `SR-LIVE-${Date.now()}-${idx}`,
    title: node.title,
    coordinates: [node.lat, node.lng],
    timestamp: node.timestamp,
    threatLevel: node.severity,
    description: node.sitrep,
    category: toCategory(`${node.title} ${node.sitrep}`),
    entities: {
      people: [],
      places: ['Global'],
      orgs: ['Serper.dev'],
    },
    rawOsint: raw.map((item) => ({
      title: item.title,
      snippet: item.snippet,
      source: item.source,
      link: item.link || '',
      publishedAt: item.date,
      queryDateContext: item.queryDateContext || '',
    })),
    isNew: true,
  }));
