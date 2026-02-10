
import { ThreatLevel, Sitrep } from './types';

export const MAP_CENTER: [number, number] = [20.0, 0.0];
export const INITIAL_ZOOM = 2;

export const TILE_LAYERS = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  topo: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
};

export const THEME_COLORS = {
  background: '#020617',
  accent: '#10b981', // Neon Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  slate: '#334155'
};

export const MOCK_SITREPS: Sitrep[] = [];
