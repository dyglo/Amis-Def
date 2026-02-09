
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, RotateCw, MoveUp, Map as MapIcon, X, Radar, Play, Square, Loader2 } from 'lucide-react';
import { TacticalButton } from './ui/TacticalButton';

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
  const [isReconSweeping, setIsReconSweeping] = useState(false);
  const [sweepProgress, setSweepProgress] = useState(0);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const panoramaRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const sweepIntervalRef = useRef<number | null>(null);

  const stopReconSweep = useCallback(() => {
    if (sweepIntervalRef.current) {
      clearInterval(sweepIntervalRef.current);
      sweepIntervalRef.current = null;
    }
    setIsReconSweeping(false);
    setSweepProgress(0);
  }, []);

  const startReconSweep = async () => {
    // Fix: Access google safely through typeof check to avoid TypeScript window property error
    if (typeof google === 'undefined' || !panoramaRef.current) return;
    
    setLoadingRoute(true);
    const directionsService = new google.maps.DirectionsService();
    const latLng = { lat: coordinates[0], lng: coordinates[1] };

    // Create a tactical loop or short path around the coordinate
    // We'll search for a route from the point to a point slightly offset
    const request = {
      origin: latLng,
      destination: { lat: coordinates[0] + 0.005, lng: coordinates[1] + 0.005 },
      travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result: any, status: any) => {
      setLoadingRoute(false);
      if (status === google.maps.DirectionsStatus.OK) {
        const path = result.routes[0].overview_path;
        setIsReconSweeping(true);
        let currentIndex = 0;

        sweepIntervalRef.current = window.setInterval(() => {
          if (currentIndex >= path.length) {
            stopReconSweep();
            return;
          }

          const nextPoint = path[currentIndex];
          panoramaRef.current.setPosition(nextPoint);
          
          // Calculate heading to next point to look ahead
          if (currentIndex < path.length - 1) {
            const heading = google.maps.geometry.spherical.computeHeading(nextPoint, path[currentIndex + 1]);
            panoramaRef.current.setPov({ heading, pitch: 0 });
          }

          setSweepProgress((currentIndex / path.length) * 100);
          currentIndex++;
        }, 2000); // Move every 2 seconds for a "sweeping" feel
      } else {
        console.error("Tactical route calculation failed:", status);
      }
    });
  };

  useEffect(() => {
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

        if (autoRotate && !isReconSweeping) {
          let heading = 165;
          const interval = setInterval(() => {
            if (!isReconSweeping) {
              heading = (heading + 0.2) % 360;
              panorama.setPov({ heading, pitch: 0 });
            }
          }, 30);
          return () => clearInterval(interval);
        }
      } else {
        setHasStreetView(false);
        const map = new google.maps.Map(containerRef.current!, {
          center: latLng,
          zoom: 18,
          mapTypeId: 'satellite',
          tilt: 45,
          disableDefaultUI: true,
        });
        mapRef.current = map;
      }
    });

    return () => {
      if (sweepIntervalRef.current) clearInterval(sweepIntervalRef.current);
    };
  }, [coordinates, autoRotate, isReconSweeping]);

  return (
    <div className={`relative bg-slate-900 border border-slate-800 ${isImmersive ? 'w-full h-full' : 'w-full h-48 rounded-lg overflow-hidden'}`}>
      <div ref={containerRef} className="w-full h-full" />
      
      {/* HUD Overlays */}
      <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
        <div className="px-1.5 py-0.5 bg-black/60 border border-emerald-500/30 text-[8px] font-mono text-emerald-400 uppercase flex items-center gap-2">
          {isReconSweeping ? (
            <><Radar size={10} className="animate-spin" /> RECON SWEEP IN PROGRESS</>
          ) : (
            hasStreetView ? 'Street-Level Recon: Active' : 'Satellite Mesh: Active'
          )}
        </div>
        <div className="px-1.5 py-0.5 bg-black/60 border border-slate-700 text-[8px] font-mono text-slate-400">
          Coords: {coordinates[0].toFixed(4)}, {coordinates[1].toFixed(4)}
        </div>
      </div>

      {isReconSweeping && (
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
           <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${sweepProgress}%` }}
              />
           </div>
           <span className="text-[8px] font-mono text-emerald-500">SWEEP PROGRESS: {Math.round(sweepProgress)}%</span>
        </div>
      )}

      {isImmersive && (
        <>
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            {hasStreetView && (
              <TacticalButton 
                variant={isReconSweeping ? "danger" : "primary"}
                onClick={isReconSweeping ? stopReconSweep : startReconSweep}
                className="!py-1 h-9"
              >
                {loadingRoute ? <Loader2 size={14} className="animate-spin" /> : (
                  isReconSweeping ? <Square size={14} /> : <Radar size={14} />
                )}
                <span className="ml-1">{isReconSweeping ? 'ABORT SWEEP' : 'RECON SWEEP'}</span>
              </TacticalButton>
            )}
            <button 
              onClick={onClose}
              className="p-2 bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-slate-950/80 border border-emerald-500/20 rounded-full backdrop-blur-md z-10">
             <div className="flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
               <RotateCw size={16} className="text-slate-500" />
               <span className="text-[8px] font-mono uppercase">Rotate</span>
             </div>
             <div className="w-px h-6 bg-slate-800 mx-2" />
             <div className="flex flex-col items-center gap-1 text-emerald-400">
               <Camera size={20} className={isReconSweeping ? "animate-bounce" : "animate-pulse"} />
               <span className="text-[8px] font-mono uppercase">Drone View</span>
             </div>
             <div className="w-px h-6 bg-slate-800 mx-2" />
             <div className="flex flex-col items-center gap-1 opacity-50 cursor-not-allowed">
               <MoveUp size={16} className="text-slate-500" />
               <span className="text-[8px] font-mono uppercase">Forward</span>
             </div>
          </div>
          
          {/* Compass Overlay */}
          <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col items-center gap-2 opacity-30 z-10">
            <div className="text-[10px] font-mono">N</div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-emerald-500 to-transparent" />
            <div className="text-[10px] font-mono">S</div>
          </div>
        </>
      )}

      {!isImmersive && hasStreetView && (
        <button 
          onClick={isReconSweeping ? stopReconSweep : startReconSweep}
          className="absolute bottom-2 right-2 p-1.5 bg-black/60 border border-emerald-500/30 text-emerald-400 hover:bg-black/80 transition-all rounded z-10"
          title="Tactical Recon Sweep"
        >
          {isReconSweeping ? <Square size={14} /> : <Radar size={14} />}
        </button>
      )}

      {!isImmersive && !hasStreetView && hasStreetView !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-10">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-black/60 px-2 py-1 border border-emerald-500/20">
             Ground Recon Limited - Satellite Only
          </span>
        </div>
      )}
    </div>
  );
};
