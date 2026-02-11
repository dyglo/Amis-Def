
import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import useSupercluster from 'use-supercluster';
import { Sitrep, ThreatLevel } from '../types';
import { MAP_CENTER, INITIAL_ZOOM, TILE_LAYERS } from '../constants';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapEngineProps {
  sitreps: Sitrep[];
  onSelectSitrep: (sitrep: Sitrep) => void;
  selectedId?: string;
  flyToCenter?: [number, number];
  flyToZoom?: number;
  currentLayer: keyof typeof TILE_LAYERS;
}

const createClusterIcon = (count: number) => {
  return createSectorClusterIcon(count, ThreatLevel.MEDIUM);
};

const threatRank: Record<ThreatLevel, number> = {
  [ThreatLevel.LOW]: 1,
  [ThreatLevel.MEDIUM]: 2,
  [ThreatLevel.HIGH]: 3,
  [ThreatLevel.CRITICAL]: 4,
};

const clusterColorByThreat = (threat: ThreatLevel) => {
  switch (threat) {
    case ThreatLevel.CRITICAL:
    case ThreatLevel.HIGH:
      return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.45)' };
    case ThreatLevel.MEDIUM:
      return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.4)' };
    case ThreatLevel.LOW:
    default:
      return { stroke: '#10b981', glow: 'rgba(16,185,129,0.35)' };
  }
};

const createSectorClusterIcon = (count: number, threat: ThreatLevel) => {
  const palette = clusterColorByThreat(threat);
  return L.divIcon({
    html: `
      <div class="relative w-12 h-12 flex items-center justify-center border-2 bg-slate-900/80 rounded-full font-mono text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)]" style="border-color:${palette.stroke}; box-shadow: 0 0 16px ${palette.glow}; color:${palette.stroke};">
        ${count}
        <div class="absolute inset-0 rounded-full border animate-ping" style="border-color:${palette.stroke};"></div>
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(48, 48)
  });
};

const createMarkerIcon = (threatLevel: ThreatLevel, isSelected: boolean, isNew: boolean = false, isProphetNode: boolean = false) => {
  if (isProphetNode) {
    return L.divIcon({
      html: `
        <div class="relative w-10 h-10 flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full border-2 border-purple-400 animate-pulse" style="border-style:dashed;"></div>
          <div class="absolute w-4 h-4 rounded-full border border-purple-300/70"></div>
          ${isSelected ? `<div class="absolute inset-0 border border-white/50 animate-spin" style="border-style:dashed; animation-duration: 8s;"></div>` : ''}
        </div>
      `,
      className: 'custom-marker-icon',
      iconSize: L.point(40, 40)
    });
  }

  const color = threatLevel === ThreatLevel.CRITICAL || threatLevel === ThreatLevel.HIGH ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)';
  const shadowColor = threatLevel === ThreatLevel.CRITICAL || threatLevel === ThreatLevel.HIGH ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)';

  return L.divIcon({
    html: `
      <div class="relative w-10 h-10 flex items-center justify-center">
        <!-- Target Lock Animation for new markers -->
        ${isNew ? `
          <div class="absolute inset-0 border border-emerald-500/60 animate-pulse scale-150"></div>
          <div class="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-emerald-400"></div>
          <div class="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-emerald-400"></div>
          <div class="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-emerald-400"></div>
          <div class="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-emerald-400"></div>
        ` : ''}
        
        <div class="w-3 h-3 rounded-full ${isSelected ? 'scale-125' : ''}" style="background-color: ${color}; box-shadow: 0 0 10px ${shadowColor};"></div>
        <div class="absolute w-6 h-6 rounded-full border-2 animate-ping" style="border-color: ${color}; animation-duration: 2s;"></div>
        ${isSelected ? `<div class="absolute inset-0 border border-white/50 animate-spin" style="border-style: dashed; animation-duration: 8s;"></div>` : ''}
      </div>
    `,
    className: 'custom-marker-icon',
    iconSize: L.point(40, 40)
  });
};


const MapInner: React.FC<MapEngineProps> = ({ sitreps, onSelectSitrep, selectedId, flyToCenter, flyToZoom }) => {
  const map = useMap();
  const [bounds, setBounds] = useState<any>(null);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

  useEffect(() => {
    if (map) {
      map.setView([20, 0], 2, { animate: false });
      map.invalidateSize();
    }
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const refresh = () => map.invalidateSize();
    const t1 = window.setTimeout(refresh, 120);
    const t2 = window.setTimeout(refresh, 500);
    window.addEventListener('resize', refresh);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', refresh);
    };
  }, [map, sitreps.length]);

  useEffect(() => {
    if (flyToCenter && map) {
      map.flyTo(flyToCenter, flyToZoom || 6, { duration: 2.5, easeLinearity: 0.25 });
    }
  }, [flyToCenter, flyToZoom, map]);

  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      setBounds([
        b.getSouthWest().lng,
        b.getSouthWest().lat,
        b.getNorthEast().lng,
        b.getNorthEast().lat
      ]);
      setZoom(map.getZoom());
    };
    update();
    map.on('moveend', update);
    return () => { map.off('moveend', update); };
  }, [map]);

  const points = useMemo(() => sitreps.map(s => ({
    type: 'Feature',
    properties: { cluster: false, sitrepId: s.id, category: s.category, threatLevel: s.threatLevel, isNew: s.isNew, title: s.title },
    geometry: { type: 'Point', coordinates: [s.coordinates[1], s.coordinates[0]] }
  })), [sitreps]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom,
    options: { radius: 80, maxZoom: 20, minPoints: 3, extent: 512, nodeSize: 64 }
  });

  const sitrepById = useMemo(() => {
    const map = new Map<string, Sitrep>();
    sitreps.forEach((s) => map.set(s.id, s));
    return map;
  }, [sitreps]);

  const linkSegments = useMemo(() => {
    const baseNodes = sitreps.filter((node) => !node.isProphetNode).slice(0, 80);
    const prophetNodes = sitreps.filter((node) => node.isProphetNode).slice(0, 30);
    const segments: Array<[[number, number], [number, number], string]> = [];
    const edgeSet = new Set<string>();

    const addSegment = (a: [number, number], b: [number, number], kind: string) => {
      const key = `${a[0].toFixed(2)},${a[1].toFixed(2)}->${b[0].toFixed(2)},${b[1].toFixed(2)}|${kind}`;
      const reverse = `${b[0].toFixed(2)},${b[1].toFixed(2)}->${a[0].toFixed(2)},${a[1].toFixed(2)}|${kind}`;
      if (edgeSet.has(key) || edgeSet.has(reverse)) return;
      edgeSet.add(key);
      segments.push([a, b, kind]);
    };

    for (let i = 0; i < Math.min(baseNodes.length - 1, 30); i += 1) {
      addSegment(
        [baseNodes[i].coordinates[0], baseNodes[i].coordinates[1]],
        [baseNodes[i + 1].coordinates[0], baseNodes[i + 1].coordinates[1]],
        'active'
      );
    }

    for (const prophet of prophetNodes) {
      let nearest: Sitrep | null = null;
      let dist = Number.POSITIVE_INFINITY;
      for (const node of baseNodes) {
        const dLat = prophet.coordinates[0] - node.coordinates[0];
        const dLng = prophet.coordinates[1] - node.coordinates[1];
        const d = dLat * dLat + dLng * dLng;
        if (d < dist) {
          dist = d;
          nearest = node;
        }
      }
      if (nearest) {
        addSegment(
          [prophet.coordinates[0], prophet.coordinates[1]],
          [nearest.coordinates[0], nearest.coordinates[1]],
          'prophet'
        );
      }
    }

    const byTheater = (keywords: string[]) =>
      baseNodes.filter((node) => {
        const text = `${node.title} ${node.description} ${node.entities.places.join(' ')} ${node.entities.orgs.join(' ')}`.toLowerCase();
        return keywords.some((k) => text.includes(k));
      });

    const gazaIsraelIranNodes = byTheater(['gaza', 'israel', 'iran', 'levant']);
    const usaNodes = byTheater(['usa', 'u.s.', 'united states', 'us force', 'washington']);

    if (gazaIsraelIranNodes.length >= 2) {
      for (let i = 0; i < gazaIsraelIranNodes.length - 1; i += 1) {
        addSegment(
          [gazaIsraelIranNodes[i].coordinates[0], gazaIsraelIranNodes[i].coordinates[1]],
          [gazaIsraelIranNodes[i + 1].coordinates[0], gazaIsraelIranNodes[i + 1].coordinates[1]],
          'theater'
        );
      }
    }

    if (usaNodes.length > 0 && gazaIsraelIranNodes.length > 0) {
      const usAnchor = usaNodes[0];
      for (const node of gazaIsraelIranNodes.slice(0, 6)) {
        addSegment(
          [usAnchor.coordinates[0], usAnchor.coordinates[1]],
          [node.coordinates[0], node.coordinates[1]],
          'theater'
        );
      }
    }

    return segments.slice(0, 60);
  }, [sitreps]);

  const renderSitrepMarker = (sitrep: Sitrep, keyPrefix: string) => {
    const MarkerAny = Marker as any;
    return (
      <MarkerAny
        key={`${keyPrefix}-${sitrep.id}`}
        position={[sitrep.coordinates[0], sitrep.coordinates[1]]}
        icon={createMarkerIcon(sitrep.threatLevel, sitrep.id === selectedId, sitrep.isNew, Boolean(sitrep.isProphetNode))}
        eventHandlers={{
          click: () => onSelectSitrep(sitrep),
        }}
      />
    );
  };

  return (
    <>
      {linkSegments.map((segment, idx) => {
        const PolylineAny = Polyline as any;
        const isProphet = segment[2] === 'prophet';
        return (
          <PolylineAny
            key={`link-${idx}`}
            positions={[segment[0], segment[1]]}
            pathOptions={{
              color: segment[2] === 'theater' ? '#ef4444' : isProphet ? '#a855f7' : '#10b981',
              weight: segment[2] === 'theater' ? 1.8 : isProphet ? 1.5 : 1,
              opacity: segment[2] === 'theater' ? 0.55 : isProphet ? 0.55 : 0.35,
              dashArray: segment[2] === 'theater' ? '8 4' : isProphet ? '6 6' : '3 6',
            }}
          />
        );
      })}
      {clusters.map(cluster => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          const clusterId = Number(cluster.id);
          const leaves = (supercluster as any).getLeaves(clusterId, pointCount) as Array<{ properties: { sitrepId: string } }>;
          if (pointCount < 3) {
            return leaves.map((leaf) => {
              const leafSitrep = sitrepById.get(leaf.properties.sitrepId);
              if (!leafSitrep) return null;
              return renderSitrepMarker(leafSitrep, 'leaf');
            });
          }

          const topThreat = leaves.reduce<ThreatLevel>((acc, leaf) => {
            const sitrep = sitrepById.get(leaf.properties.sitrepId);
            if (!sitrep) return acc;
            return threatRank[sitrep.threatLevel] > threatRank[acc] ? sitrep.threatLevel : acc;
          }, ThreatLevel.LOW);

          const summary = leaves
            .map((leaf) => sitrepById.get(leaf.properties.sitrepId)?.title)
            .filter(Boolean)
            .slice(0, 5) as string[];

          const MarkerAny = Marker as any;
          return (
            <MarkerAny
              key={`cluster-${cluster.id}`}
              position={[latitude, longitude]}
              icon={createSectorClusterIcon(pointCount, topThreat)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    (supercluster as any).getClusterExpansionZoom(cluster.id),
                    20
                  );
                  map.flyTo([latitude, longitude], expansionZoom, { animate: true, duration: 0.8 });
                }
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                <div className="font-mono text-[10px] text-slate-100">
                  <div className="uppercase tracking-wider text-slate-300 mb-1">Sector Summary ({pointCount})</div>
                  {summary.length > 0 ? summary.map((item, idx) => (
                    <div key={`summary-${cluster.id}-${idx}`}>- {item}</div>
                  )) : <div>- No conflict labels available</div>}
                </div>
              </Tooltip>
            </MarkerAny>
          );
        }

        const sitrep = sitreps.find(s => s.id === cluster.properties.sitrepId);
        if (!sitrep) return null;

        // Explicit marker return prevents silent no-render issues in map() callbacks.
        return renderSitrepMarker(sitrep, 'marker');
      })}
    </>
  );
};

export const MapEngine: React.FC<MapEngineProps> = (props) => {
  const MapContainerAny = MapContainer as any;
  const TileLayerAny = TileLayer as any;

  return (
    <div className="relative w-full h-full bg-transparent">
      <MapContainerAny
        center={MAP_CENTER}
        zoom={INITIAL_ZOOM}
        preferCanvas={true}
        minZoom={2}
        worldCopyJump={true}
        zoomControl={false}
        zoomSnap={0}
        zoomDelta={0.2}
        wheelPxPerZoomLevel={60}
        className="w-full h-full bg-transparent"
      >
        <TileLayerAny
          url={TILE_LAYERS[props.currentLayer]}
          attribution='&copy; Alpha legrand Tactical Data'
        />
        <MapInner {...props} />
        <ZoomControl position="bottomleft" />
      </MapContainerAny>
    </div>
  );
};
