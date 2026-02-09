
import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, ZoomControl } from 'react-leaflet';
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
  return L.divIcon({
    html: `
      <div class="relative w-10 h-10 flex items-center justify-center border-2 border-emerald-500/50 bg-slate-900/80 rounded-full font-mono text-emerald-400 text-xs shadow-[0_0_15px_rgba(16,185,129,0.3)]">
        ${count}
        <div class="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping"></div>
      </div>
    `,
    className: 'custom-cluster-icon',
    iconSize: L.point(40, 40)
  });
};

const createMarkerIcon = (threatLevel: ThreatLevel, isSelected: boolean, isNew: boolean = false) => {
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

const TacticalOverlay = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-[1000]">
      <div className="w-full h-full opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
      <div className="w-full h-full shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
};

const MapInner: React.FC<MapEngineProps> = ({ sitreps, onSelectSitrep, selectedId, flyToCenter, flyToZoom }) => {
  const map = useMap();
  const [bounds, setBounds] = useState<any>(null);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);

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
    properties: { cluster: false, sitrepId: s.id, category: s.category, threatLevel: s.threatLevel, isNew: s.isNew },
    geometry: { type: 'Point', coordinates: [s.coordinates[1], s.coordinates[0]] }
  })), [sitreps]);

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds,
    zoom,
    options: { radius: 75, maxZoom: 20 }
  });

  return (
    <>
      {clusters.map(cluster => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount } = cluster.properties;

        if (isCluster) {
          return (
            <Marker
              key={`cluster-${cluster.id}`}
              position={[latitude, longitude]}
              icon={createClusterIcon(pointCount)}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(
                    supercluster.getClusterExpansionZoom(cluster.id),
                    20
                  );
                  map.setView([latitude, longitude], expansionZoom, { animate: true });
                }
              }}
            />
          );
        }

        const sitrep = sitreps.find(s => s.id === cluster.properties.sitrepId);
        if (!sitrep) return null;

        return (
          <Marker
            key={`marker-${sitrep.id}`}
            position={[latitude, longitude]}
            icon={createMarkerIcon(sitrep.threatLevel, sitrep.id === selectedId, sitrep.isNew)}
            eventHandlers={{
              click: () => onSelectSitrep(sitrep)
            }}
          />
        );
      })}
    </>
  );
};

export const MapEngine: React.FC<MapEngineProps> = (props) => {
  return (
    <div className="relative w-full h-full bg-[#020617]">
      <MapContainer 
        center={MAP_CENTER} 
        zoom={INITIAL_ZOOM} 
        zoomControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url={TILE_LAYERS[props.currentLayer]}
          attribution='&copy; Aegis-Grid Tactical Data'
        />
        <MapInner {...props} />
        <ZoomControl position="bottomleft" />
      </MapContainer>
      <TacticalOverlay />
    </div>
  );
};
