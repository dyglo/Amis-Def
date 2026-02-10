
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface Sitrep {
  id: string;
  title: string;
  coordinates: [number, number];
  timestamp: string;
  threatLevel: ThreatLevel;
  description: string;
  category: 'CONFLICT' | 'MARITIME' | 'CYBER' | 'POLITICAL';
  entities: {
    people: string[];
    places: string[];
    orgs: string[];
  };
  isNew?: boolean;
  riskScore?: number;
  rawOsint?: OsintNewsItem[];
  isProphetNode?: boolean;
  probabilityAnalysis?: string;
  leadingIndicators?: string[];
}

export interface IntelligenceAnalysis {
  strategicOverview: string;
  geopoliticalImplications: string;
  recommendedResponse: string;
  links: Array<{ title: string; uri: string }>;
  riskScore: number;
  immediateFacts: string[];
  strategicDeductions: string[];
  actors: {
    state: string[];
    nonState: string[];
  };
  reasoningSteps: string[];
}

export interface OsintNewsItem {
  title: string;
  snippet: string;
  source: string;
  link: string;
  publishedAt?: string;
  queryDateContext: string;
}

export interface ProphetNode {
  id: string;
  title: string;
  coordinates: [number, number];
  timestamp: string;
  probabilityAnalysis: string;
  leadingIndicators: string[];
  confidence: number;
  sourceLinks: string[];
}
