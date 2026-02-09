
import React, { useEffect, useRef, useState } from 'react';
import { Camera, RotateCw, MoveUp, Map as MapIcon, X } from 'lucide-react';

// Fix: Declare google as a global variable to resolve TypeScript "Cannot find name 'google'" errors
declare const google: any;

interface GroundTruthViewerProps {
  coordinates: [number, number];
  isImmersive?: boolean;
  onClose?: () => void;
  autoRotate?: boolean;
}

export const GroundTruthViewer: React.FC<GroundTruthViewerProps> = ({ 
  coordinates, 
  isImmersive = false, 
  onClose,
  autoRotate = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStreetView, setHasStreetView] = useState<boolean | null>(null);
  const panoramaRef = useRef<any>(null);

  useEffect(() => {
    // Fix: Check for the presence of the google global object before initialization to avoid "Property 'google' does not exist on type 'Window'"
    if (!containerRef.current || typeof google === 'undefined') return;

    const latLng = { lat: coordinates[0], lng: coordinates[1] };
    const sv = new google.maps.StreetViewService();

    sv.getPanorama({ location: latLng, radius: 2000 }, (data: any, status: any) => {
      if (status === google.maps.StreetViewStatus.OK && data && data.location) {
        setHasStreetView(true);
        const panorama = new google.maps.StreetViewPanorama(containerRef.current!, {
          position: data.location.latLng,
          pov: { heading: 165, pitch: 0 },
          zoom: 1,
          disableDefaultUI: true,
          motionTracking: false,
          showRoadLabels: false,
        });
        panoramaRef.current = panorama;

        if (autoRotate) {
          let heading = 165;
          const interval = setInterval(() => {
            heading = (heading + 0.2) % 360;
            panorama.setPov({ heading, pitch: 0 });
          }, 30);
          return () => clearInterval(interval);
        }
      } else {
        setHasStreetView(false);
        // Fallback to 3D Static Map or Satellite View if StreetView unavailable
        const map = new google.maps.Map(containerRef.current!, {
          center: latLng,
          zoom: 18,
          mapTypeId: 'satellite',
          tilt: 45,
          disableDefaultUI: true,
        });
      }
    });
  }, [coordinates, autoRotate]);

  return (
    <div className={`relative bg-slate-900 border border-slate-800 ${isImmersive ? 'w-full h-full' : 'w-full h-48 rounded-lg overflow-hidden'}`}>
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD Overlays */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none">
        <div className="px-1.5 py-0.5 bg-black/60 border border-emerald-500/30 text-[8px] font-mono text-emerald-400 uppercase">
          {hasStreetView ? 'Street-Level Recon: Active' : 'Satellite Mesh: Active'}
        </div>
        <div className="px-1.5 py-0.5 bg-black/60 border border-slate-700 text-[8px] font-mono text-slate-400">
          Coords: {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
        </div>
      </div>

      {isImmersive && (
        <>
          <div className="absolute top-4 right-4 flex gap-2">
            <button 
              onClick={onClose}
              className="p-2 bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-slate-950/80 border border-emerald-500/20 rounded-full backdrop-blur-md">
             <div className="flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
               <RotateCw size={16} className="text-slate-500" />
               <span className="text-[8px] font-mono uppercase">Rotate</span>
             </div>
             <div className="w-px h-6 bg-slate-800 mx-2" />
             <div className="flex flex-col items-center gap-1 text-emerald-400">
               <Camera size={20} className="animate-pulse" />
               <span className="text-[8px] font-mono uppercase">Drone View</span>
             </div>
             <div className="w-px h-6 bg-slate-800 mx-2" />
             <div className="flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
               <MoveUp size={16} className="text-slate-500" />
               <span className="text-[8px] font-mono uppercase">Forward</span>
             </div>
          </div>
          
          {/* Compass Overlay */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col items-center gap-2 opacity-30">
            <div className="text-[10px] font-mono">N</div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
            <div className="text-[10px] font-mono">S</div>
          </div>
        </>
      )}

      {!isImmersive && !hasStreetView && hasStreetView !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-black/60 px-2 py-1 border border-emerald-500/20">
             Ground Recon Limited - Satellite Only
          </span>
        </div>
      )}
    </div>
  );
};
