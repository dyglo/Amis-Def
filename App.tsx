
import React, { useState, useMemo } from 'react';
import { CommandCenter } from './components/CommandCenter';
import { MapEngine } from './components/MapEngine';
import { IntelligencePanel } from './components/IntelligencePanel';
import { Sitrep } from './types';
import { MOCK_SITREPS } from './constants';
import { Search, Map as MapIcon, Layers, Filter, Menu } from 'lucide-react';

const App: React.FC = () => {
  const [selectedSitrep, setSelectedSitrep] = useState<Sitrep | null>(null);
  const [timeValue, setTimeValue] = useState(100);

  // Memoize map to prevent unnecessary full re-renders when sidebar updates
  const mapElement = useMemo(() => (
    <MapEngine 
      sitreps={MOCK_SITREPS} 
      onSelectSitrep={setSelectedSitrep}
      selectedId={selectedSitrep?.id}
    />
  ), [selectedSitrep?.id]);

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#020617] text-slate-200 overflow-hidden font-sans">
      <CommandCenter />
      
      <main className="flex-1 flex pt-14 relative overflow-hidden">
        {/* Left Toolbar */}
        <nav className="w-14 border-r border-slate-800 flex flex-col items-center py-6 gap-6 bg-slate-950/50 z-[1050]">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer">
            <MapIcon size={20} />
          </div>
          <div className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer">
            <Layers size={20} />
          </div>
          <div className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer">
            <Filter size={20} />
          </div>
          <div className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer mt-auto">
            <Search size={20} />
          </div>
          <div className="p-2.5 rounded-lg hover:bg-slate-800 text-slate-500 transition-colors cursor-pointer">
            <Menu size={20} />
          </div>
        </nav>

        {/* Primary Content: Map */}
        <div className="flex-1 relative">
          {mapElement}
          
          {/* Bottom Time Scrubber */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1050] w-[60%] px-8 py-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-sm shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Time Scrubber: T-30 Days</span>
              <span className="font-mono text-[10px] text-emerald-400">REALTIME SYNC ACTIVE</span>
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
              <span>DAY -30</span>
              <span>DAY -15</span>
              <span className="text-emerald-500">CURRENT (NOW)</span>
            </div>
          </div>
        </div>

        {/* Right Intelligence Panel */}
        <aside className={`transition-all duration-500 ease-in-out ${selectedSitrep ? 'w-[450px]' : 'w-0'} h-full overflow-hidden z-[1050]`}>
          <div className="w-[450px] h-full">
            <IntelligencePanel 
              selectedSitrep={selectedSitrep} 
              onClose={() => setSelectedSitrep(null)} 
            />
          </div>
        </aside>
      </main>

      {/* Global Footer Overlay Status */}
      <footer className="absolute bottom-0 left-14 right-0 h-6 bg-slate-950/90 border-t border-slate-800 z-[1060] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest">Global Surveillance Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono text-slate-600 uppercase">Conflict Nodes: </span>
            <span className="text-[8px] font-mono text-red-500">12</span>
          </div>
        </div>
        <div className="text-[8px] font-mono text-slate-600 uppercase">
          Classification: TOP SECRET // SI // NOFORN
        </div>
      </footer>
    </div>
  );
};

export default App;
