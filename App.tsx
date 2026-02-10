
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CommandCenter } from './components/CommandCenter';
import { MapEngine } from './components/MapEngine';
import { IntelligencePanel } from './components/IntelligencePanel';
import { SearchDrawer, LayersDrawer, FilterDrawer, MenuDrawer } from './components/SidebarDrawers';
import { Sitrep, ThreatLevel } from './types';
import { TILE_LAYERS } from './constants';
import { Search, Map as MapIcon, Layers, Filter, Menu, Eye } from 'lucide-react';
import { intelligenceService } from './services/intelligenceService';
import { GroundTruthViewer } from './components/GroundTruthViewer';
import { TEMPORAL_START_UTC, temporalDateFromSlider, toIsoDay } from './services/temporal';
import { useIntelligenceStore } from './store/intelligenceStore';
import { runMultiAgentHandshake } from './agents/handshake';
import { useIntelligenceStream } from './hooks/useIntelligenceStream';
import { fetchGlobalConflictNews, toSitrepsFromLiveNodes } from './services/liveIngestionService';

const App: React.FC = () => {
  const [selectedSitrepId, setSelectedSitrepId] = useState<string | null>(null);
  const [timeValue, setTimeValue] = useState(100);

  // Navigation State
  const [activeDrawer, setActiveDrawer] = useState<null | 'search' | 'layers' | 'filter' | 'menu'>(null);
  const [currentLayer, setCurrentLayer] = useState<keyof typeof TILE_LAYERS>('dark');
  const [activeFilters, setActiveFilters] = useState<string[]>(['CONFLICT', 'MARITIME', 'CYBER', 'POLITICAL']);
  const [logs, setLogs] = useState<string[]>(["System initialized.", "Uplink stable.", "Temporal context: Jan 2020 to Present"]);
  const sitreps = useIntelligenceStore((state) => state.sitreps);
  const temporalDate = useIntelligenceStore((state) => state.temporalDate);
  const setTemporalDate = useIntelligenceStore((state) => state.setTemporalDate);
  const mergeSitreps = useIntelligenceStore((state) => state.mergeSitreps);
  const isSearching = useIntelligenceStore((state) => state.isSearching);
  const setSearching = useIntelligenceStore((state) => state.setSearching);
  const setUplinkLatency = useIntelligenceStore((state) => state.setUplinkLatency);
  const setProphetNodes = useIntelligenceStore((state) => state.setProphetNodes);

  // Map Navigation
  const [flyToCenter, setFlyToCenter] = useState<[number, number] | undefined>(undefined);
  const [flyToZoom, setFlyToZoom] = useState<number | undefined>(undefined);

  // Recon Mode
  const [reconSitrep, setReconSitrep] = useState<Sitrep | null>(null);
  const selectedSitrep = useMemo(
    () => sitreps.find((sitrep) => sitrep.id === selectedSitrepId) || null,
    [selectedSitrepId, sitreps]
  );

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  }, []);

  useIntelligenceStream({
    intervalMs: Number(import.meta.env.VITE_INTEL_POLL_INTERVAL_MS || 300000),
    onPulse: (count) => addLog(`IntelligenceStream pulse: ${count} global hotspots ingested.`),
  });

  const runLiveIngestionPipeline = useCallback(async () => {
    try {
      const live = await fetchGlobalConflictNews();
      const sitrepsFromLive = toSitrepsFromLiveNodes(live.nodes, live.raw);
      if (sitrepsFromLive.length > 0) {
        mergeSitreps(sitrepsFromLive);
        addLog(`Live pipeline ingest: ${sitrepsFromLive.length} markers restored from Serper + o1.`);
      }

      if (live.raw.length > 0) {
        const prophet = await intelligenceService.runProphet(
          live.raw.map((item) => ({
            title: item.title,
            snippet: item.snippet,
            source: item.source,
            link: item.link || '',
            publishedAt: item.date,
          })),
          temporalDate
        );

        setProphetNodes(prophet.prophetNodes);

        const prophetSitreps = prophet.prophetNodes.map((node, idx) => ({
          id: node.id || `PR-LIVE-${Date.now()}-${idx}`,
          title: node.title,
          coordinates: node.coordinates,
          timestamp: node.timestamp,
          threatLevel: ThreatLevel.HIGH,
          description: node.probabilityAnalysis,
          category: 'CONFLICT' as const,
          entities: {
            people: [],
            places: ['Forecast'],
            orgs: ['ProphetAgent'],
          },
          isProphetNode: true,
          probabilityAnalysis: node.probabilityAnalysis,
          leadingIndicators: node.leadingIndicators,
        }));

        if (prophetSitreps.length > 0) {
          mergeSitreps(prophetSitreps);
          addLog(`Prophet loop: ${prophetSitreps.length} predictive nodes updated.`);
        }
      }
    } catch (error) {
      addLog('Live ingestion pipeline failed. Maintaining existing tactical state.');
    }
  }, [addLog, mergeSitreps, setProphetNodes, temporalDate]);

  const handleSearch = async (query: string, includeGlobalHotspots: boolean = false) => {
    const start = performance.now();
    setSearching(true);
    addLog(`Initiating OSINT scan for: ${query}`);
    try {
      const result = await intelligenceService.searchNewIntelligence(query, temporalDate, 20, undefined, includeGlobalHotspots);
      addLog(`Scan complete. Found ${result.sitreps.length} tactical nodes in global dataset.`);

      const newSitreps = result.sitreps.map(s => ({ ...s, isNew: true, rawOsint: result.raw }));
      mergeSitreps(newSitreps);

      setFlyToCenter(result.center);
      setFlyToZoom(result.zoom);

      await runMultiAgentHandshake({
        sitreps: newSitreps,
        raw: result.raw,
        temporalDate,
      });
    } catch (error) {
      addLog("Critical Error: Search uplink interrupted.");
    } finally {
      setUplinkLatency(Math.round(performance.now() - start));
      setSearching(false);
    }
  };

  const toggleFilter = (cat: string) => {
    setActiveFilters(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  useEffect(() => {
    setTemporalDate(temporalDateFromSlider(timeValue));
  }, [setTemporalDate, timeValue]);

  // Global initialization and first-load world recenter.
  useEffect(() => {
    setFlyToCenter([20, 0]);
    setFlyToZoom(2);
    handleSearch("Armed Conflict Civil Unrest Cyber Warfare", true);
  }, []);

  // Live ingest pipeline on mount + Prophet refresh every 10 minutes.
  useEffect(() => {
    void runLiveIngestionPipeline();
    const timer = window.setInterval(() => {
      void runLiveIngestionPipeline();
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [runLiveIngestionPipeline]);

  // Filter sitreps based on category and global temporal scrubber (2020-present)
  const filteredSitreps = useMemo(() => {
    const timeThreshold = temporalDateFromSlider(timeValue);

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
      onSelectSitrep={(sitrep) => setSelectedSitrepId(sitrep.id)}
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
        <nav className="w-14 border-r border-slate-800 flex flex-col items-center py-6 gap-6 bg-[#020202]/90 z-[1100]">
          <div
            onClick={() => setActiveDrawer(activeDrawer === 'layers' ? null : 'layers')}
            className={`p-2.5 rounded-lg cursor-pointer transition-all ${activeDrawer === 'layers' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-white'}`}
          >
            <Layers size={20} />
          </div>
          <div
            onClick={() => setActiveDrawer(activeDrawer === 'filter' ? null : 'filter')}
            className={`p-2.5 rounded-lg cursor-pointer transition-all ${activeDrawer === 'filter' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-white'}`}
          >
            <Filter size={20} />
          </div>
          <div
            onClick={() => setActiveDrawer(activeDrawer === 'search' ? null : 'search')}
            className={`p-2.5 rounded-lg cursor-pointer mt-auto transition-all ${activeDrawer === 'search' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-white'}`}
          >
            <Search size={20} />
          </div>
          <div
            onClick={() => setActiveDrawer(activeDrawer === 'menu' ? null : 'menu')}
            className={`p-2.5 rounded-lg cursor-pointer transition-all ${activeDrawer === 'menu' ? 'bg-white/10 text-white border border-white/20' : 'text-slate-500 hover:text-white'}`}
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
        <div className="flex-1 relative bg-transparent">
          {reconSitrep ? (
            <div className="w-full h-full animate-in fade-in zoom-in duration-700">
              <GroundTruthViewer
                coordinates={reconSitrep.coordinates}
                isImmersive
                autoRotate
                onClose={() => setReconSitrep(null)}
              />

              {/* Recon HUD overlay */}
              <div className="absolute top-20 left-10 pointer-events-none space-y-2">
                <div className="font-mono text-[10px] text-emerald-500 uppercase tracking-[0.3em] bg-black/40 px-3 py-1 border-l-2 border-emerald-500">
                  Live Uplink: Sector {reconSitrep.id}
                </div>
                <h2 className="text-2xl font-black text-white bg-black/40 px-3 py-1 italic uppercase tracking-tighter">
                  {reconSitrep.title}
                </h2>
                <div className="font-mono text-[10px] text-slate-400 bg-black/40 px-3 py-1">
                  Temporal Target: {toIsoDay(temporalDate)} // OSINT Verified
                </div>
              </div>
            </div>
          ) : (
            <>
              {mapElement}
              {/* Bottom Time Scrubber */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1050] w-[60%] px-8 py-4 bg-[#020202]/90 backdrop-blur-md border border-slate-800 rounded-sm shadow-2xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Temporal Analysis (2020-Present)</span>
                  <span className="font-mono text-[10px] text-emerald-400">SYNC: {toIsoDay(temporalDate)}</span>
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
                  <span>{toIsoDay(TEMPORAL_START_UTC)}</span>
                  <span>2023-01-01</span>
                  <span className="text-emerald-500">{toIsoDay(new Date())}</span>
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
              onClose={() => setSelectedSitrepId(null)}
              onEnterRecon={(sitrep) => setReconSitrep(sitrep)}
            />
          </div>
        </aside>
      </main>

      {/* Global Footer Overlay Status */}
      <footer className="absolute bottom-0 left-14 right-0 h-6 bg-[#020202] border-t border-slate-800 z-[1060] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Global Surveillance Active (2020-Present)</span>
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
