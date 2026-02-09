
import { ThreatLevel, Sitrep } from './types';

export const MAP_CENTER: [number, number] = [34.0, 44.0]; // Near Middle East for tactical demo context
export const INITIAL_ZOOM = 4;

export const THEME_COLORS = {
  background: '#020617',
  accent: '#10b981', // Neon Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  slate: '#334155'
};

export const MOCK_SITREPS: Sitrep[] = [
  {
    id: 'SR-001',
    title: 'Anomalous Naval Activity',
    coordinates: [30.63, 32.31],
    timestamp: new Date().toISOString(),
    threatLevel: ThreatLevel.HIGH,
    category: 'MARITIME',
    description: 'Unidentified submarine activity detected near the Suez Canal approach. AIS tracking disabled on multiple vessels.',
    entities: {
      people: ['Adm. Richards'],
      places: ['Suez Canal', 'Port Said'],
      orgs: ['Seventh Fleet']
    }
  },
  {
    id: 'SR-002',
    title: 'Localized Power Grid Disruption',
    coordinates: [33.31, 44.36],
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    threatLevel: ThreatLevel.MEDIUM,
    category: 'CYBER',
    description: 'Baghdad infrastructure reports multiple SCADA system failures. Potential state-sponsored intrusion suspected.',
    entities: {
      people: [],
      places: ['Baghdad'],
      orgs: ['Iraqi Ministry of Electricity', 'Unit 8200']
    }
  },
  {
    id: 'SR-003',
    title: 'Border Reinforcement Maneuvers',
    coordinates: [31.5, 34.4],
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    threatLevel: ThreatLevel.CRITICAL,
    category: 'CONFLICT',
    description: 'Rapid movement of armored divisions detected via satellite imagery. Electronic warfare emitters active in the sector.',
    entities: {
      people: ['Gen. Hassan'],
      places: ['Gaza Envelope'],
      orgs: ['Southern Command']
    }
  }
];
