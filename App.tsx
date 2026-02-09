
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CommandCenter } from './components/CommandCenter';
import { MapEngine } from './components/MapEngine';
import { IntelligencePanel } from './components/IntelligencePanel';
import { SearchDrawer, LayersDrawer, FilterDrawer, MenuDrawer } from './components/SidebarDrawers';
import { Sitrep } from './types';
import { MOCK_SITREPS, TILE_LAYERS } from './constants';
import { Search, Map as MapIcon, Layers, Filter, Menu, Eye } from 'lucide-react';
import { intelligenceService } from './services/gemini';
import { GroundTruthViewer } from './components/GroundTruthViewer';

const App: React.FC = () => {
  const [selectedSitrep, setSelectedSitrep] = useState<Sitrep | null>(null);
  const [sitreps, setSitreps] = useState<Sitrep[]>(MOCK_SITREPS);
  const [timeValue, setTimeValue] = useState(100);
  
  // Navigation State
  const [activeDrawer, setActiveDrawer] = useState<null | 'search' | 'layers' | 'filter' | 'menu'>(null);
  const [currentLayer, setCurrentLayer] = useState<keyof typeof TILE_LAYERS>('dark');
  const [activeFilters, setActiveFilters] = useState<string[]>(['CONFLICT', 'MARITIME', 'CYBER', 'POLITICAL']);
  const [isSearching, setIsSearching] = useState(false);
  const [logs, setLogs] = useState<string[]>(["System initialized.", "Uplink stable.", "Temporal context: Feb 2026"]);

  // Map Navigation
  const [flyToCenter, setFlyToCenter] = useState<[number, number] | undefined>(undefined);
  const [flyToZoom, setFlyToZoom] = useState<number | undefined>(undefined);

  // Recon Mode
  const [reconSitrep, setReconSitrep] = useState<Sitrep | null>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  }, []);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    addLog(`Initiating OSINT scan for: ${query}`);
    try {
      const result = await intelligenceService.searchNewIntelligence(query);
      addLog(`Scan complete. Found ${result.sitreps.length} new nodes in early 2026 dataset.`);
      
      const newSitreps = result.sitreps.map(s => ({ ...s, isNew: true }));
      setSitreps(prev => {
        // Simple deduplication by ID
        const combined = [...newSitreps, ...prev];
        return Array.from(new Map(combined.map(s => [s.id, s])).values());
      });

      setFlyToCenter(result.center);
      setFlyToZoom(result.zoom);
    } catch (error) {
      addLog("Critical Error: Search uplink interrupted.");
    } finally {
      setIsSearching(false);
    }
  };

  const toggleFilter = (cat: string) => {
    setActiveFilters(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Sync initial 2026 state
  useEffect(() => {
    // Force a search for "Jonglei South Sudan 2026" on initial load to populate current context
    handleSearch("Current conflict hotspots Jonglei Sudan Eastern DRC February 2026");
  }, []);

  // Filter sitreps based on category and time scrubber (aligned to 2026)
  const filteredSitreps = useMemo(() => {
    // Current date assumed to be Feb 24, 2026 for the scrubber's "NOW"
    const currentSimDate = new Date("2026-02-24T00:00:00Z");
    const timeThreshold = new Date(currentSimDate);
    timeThreshold.setDate(currentSimDate.getDate() - (30 - (timeValue / 100 * 30)));
    
    return sitreps.filter(s => {
      const matchCat = activeFilters.includes(s.category);
      const matchTime = new Date(s.timestamp) <= timeThreshold;
      return matchCat && matchTime;
    });
  }, [sitreps, activeFilters, timeValue]);

  // Memoize map to prevent unnecessary full re-renders
  const mapElement = useMemo(() => (
    <MapEngine 
      sitreps={filteredSitreps} 
      onSelectSitrep={setSelectedSitrep}
      selectedId={selectedSitrep?.id}
      flyToCenter={flyToCenter}
      flyToZoom={flyToZoom}
      currentLayer={currentLayer}
    />
  ), [filteredSitreps, selectedSitrep?.id, flyToCenter, flyToZoom, currentLayer]);

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <CommandCenter />
      
      <main className="flex-1 flex pt-14 relative overflow-hidden">
        {/* Left Nav Bar */}
        <nav className="w-14 border-r border-slate-800 flex flex-col items-center py-6 gap-6 bg-slate-950/50 z-[1100]">
          <div 
            onClick={() => setActiveDrawer(activeDrawer === 'layers' ? null : 'layers')}
            className={`p-2.5 rounded-lg cursor-pointer transition-all ${activeDrawer === 'layers' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Layers size={20} />
          </div>
          <div 
            onClick={() => setActiveDrawer(activeDrawer === 'filter' ? null : 'filter')}
            className={`p-2.5 rounded-lg cursor-pointer transition-all ${activeDrawer === 'filter' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Filter size={20} />
          </div>
          <div 
            onClick={() => setActiveDrawer(activeDrawer === 'search' ? null : 'search')}
            className={`p-2.5 rounded-lg cursor-pointer mt-auto transition-all ${activeDrawer === 'search' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Search size={20} />
          </div>
          <div 
            onClick={() => setActiveDrawer(activeDrawer === 'menu' ? null : 'menu')}
            className={`p-2.5 rounded-lg cursor-pointer transition-all ${activeDrawer === 'menu' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Menu size={20} />
          </div>
        </nav>

        {/* Dynamic Drawers */}
        <SearchDrawer 
          isOpen={activeDrawer === 'search'} 
          onClose={() => setActiveDrawer(null)} 
          onSearch={handleSearch}
          isSearching={isSearching}
        />
        <LayersDrawer 
          isOpen={activeDrawer === 'layers'} 
          onClose={() => setActiveDrawer(null)} 
          currentLayer={currentLayer}
          onSetLayer={setCurrentLayer}
        />
        <FilterDrawer 
          isOpen={activeDrawer === 'filter'} 
          onClose={() => setActiveDrawer(null)} 
          activeFilters={activeFilters}
          toggleFilter={toggleFilter}
        />
        <MenuDrawer 
          isOpen={activeDrawer === 'menu'} 
          onClose={() => setActiveDrawer(null)} 
          logs={logs}
        />

        {/* Primary Content: Map or Recon */}
        <div className="flex-1 relative bg-black">
          {reconSitrep ? (
            <div className="w-full h-full animate-in fade-in zoom-in duration-700">
               <GroundTruthViewer 
                coordinates={reconSitrep.coordinates} 
                isImmersive 
                autoRotate
                onClose={() => setReconSitrep(null)} 
               />
               
               {/* Recon HUD overlay specific to 2026 data */}
               <div className="absolute top-20 left-10 pointer-events-none space-y-2">
                 <div className="font-mono text-[10px] text-emerald-500 uppercase tracking-[0.3em] bg-black/40 px-3 py-1 border-l-2 border-emerald-500">
                    Live Uplink: Sector {reconSitrep.id}
                 </div>
                 <h2 className="text-2xl font-black text-white bg-black/40 px-3 py-1 italic uppercase tracking-tighter">
                    {reconSitrep.title}
                 </h2>
                 <div className="font-mono text-[10px] text-slate-400 bg-black/40 px-3 py-1">
                    Temporal Target: Feb 2026 // OSINT Verified
                 </div>
               </div>
            </div>
          ) : (
            <>
              {mapElement}
              {/* Bottom Time Scrubber */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1050] w-[60%] px-8 py-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-sm shadow-2xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Temporal Analysis (2026)</span>
                  <span className="font-mono text-[10px] text-emerald-400">SYNC: FEB 2026 // T-{30 - Math.floor(timeValue / 100 * 30)} DAYS</span>
                </div>
                <div className="relative group">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={timeValue}
                    onChange={(e) => setTimeValue(parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                  />
                  <div className="flex justify-between mt-1 px-1">
                    {[...Array(11)].map((_, i) => (
                      <div key={i} className="w-px h-1 bg-slate-700" />
                    ))}
                  </div>
                </div>
                <div className="flex justify-between text-[8px] font-mono text-slate-600 mt-2">
                  <span>JAN 25, 2026</span>
                  <span>FEB 09, 2026</span>
                  <span className="text-emerald-500">FEB 24, 2026</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Intelligence Panel */}
        <aside className={`transition-all duration-500 ease-in-out ${selectedSitrep ? 'w-[450px]' : 'w-0'} h-full overflow-hidden z-[1050]`}>
          <div className="w-[450px] h-full">
            <IntelligencePanel 
              selectedSitrep={selectedSitrep} 
              onClose={() => setSelectedSitrep(null)} 
              onEnterRecon={(sitrep) => setReconSitrep(sitrep)}
            />
          </div>
        </aside>
      </main>

      {/* Global Footer Overlay Status */}
      <footer className="absolute bottom-0 left-14 right-0 h-6 bg-slate-950/90 border-t border-slate-800 z-[1060] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Global Surveillance Active (2026)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-slate-600 uppercase">Nodes: </span>
            <span className="text-[8px] font-mono text-emerald-500">{filteredSitreps.length} Visible</span>
          </div>
        </div>
        <div className="text-[8px] font-mono text-slate-600 uppercase flex items-center gap-2">
          {reconSitrep && <div className="flex items-center gap-1 text-emerald-400"><Eye size={10} /> RECON MODE ACTIVE</div>}
          <span>Classification: TOP SECRET // SI // NOFORN</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
