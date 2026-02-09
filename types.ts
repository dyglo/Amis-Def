
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
}

export interface IntelligenceAnalysis {
  strategicOverview: string;
  geopoliticalImplications: string;
  recommendedResponse: string;
  links: Array<{ title: string; uri: string }>;
}
