
import React, { useState } from 'react';
import { Search, Map as MapIcon, Filter, Settings, FileText, ChevronRight, Download, Terminal, X, Loader2 } from 'lucide-react';
import { TILE_LAYERS } from '../constants';
import { TacticalButton } from './ui/TacticalButton';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => (
  <div className={`absolute left-14 top-14 bottom-6 transition-all duration-300 z-[1060] ${isOpen ? 'w-80' : 'w-0'} overflow-hidden bg-[#020202]/95 border-r border-slate-800 backdrop-blur-md`}>
    <div className="w-80 h-full flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-mono text-xs text-slate-200 uppercase tracking-widest">{title}</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {children}
      </div>
    </div>
  </div>
);

export const SearchDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSearch: (q: string) => Promise<void>;
  isSearching: boolean;
}> = ({ isOpen, onClose, onSearch, isSearching }) => {
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query);
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Global Search">
      <form onSubmit={handleSearch} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Region / Conflict..."
            className="w-full bg-slate-900/50 border border-slate-700 p-3 pl-10 rounded font-mono text-xs text-slate-300 focus:border-white/50 outline-none"
          />
          <Search className="absolute left-3 top-3 text-slate-500" size={16} />
        </div>
        <TacticalButton variant="primary" className="w-full" onClick={() => onSearch(query)}>
          {isSearching ? <Loader2 className="animate-spin" size={14} /> : 'Execute Scan'}
        </TacticalButton>
        <div className="space-y-2 pt-4">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Suggested Scans</p>
          {['Middle East Activity', 'Eastern Europe Border', 'South China Sea OSINT'].map(s => (
            <button key={s} onClick={() => { setQuery(s); onSearch(s); }} className="block w-full text-left p-2 text-xs font-mono text-slate-400 hover:text-white border border-transparent hover:border-white/20 rounded transition-all">
              {"> "} {s}
            </button>
          ))}
        </div>
      </form>
    </Drawer>
  );
};

export const LayersDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  currentLayer: string;
  onSetLayer: (l: keyof typeof TILE_LAYERS) => void;
}> = ({ isOpen, onClose, currentLayer, onSetLayer }) => (
  <Drawer isOpen={isOpen} onClose={onClose} title="Map Layers">
    <div className="space-y-4">
      {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map(key => (
        <button
          key={key}
          onClick={() => onSetLayer(key)}
          className={`w-full p-4 border flex items-center justify-between font-mono text-xs transition-all ${currentLayer === key ? 'border-white/20 bg-white/5 text-slate-200' : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700'
            }`}
        >
          <span className="uppercase">{key} Recon</span>
          {currentLayer === key && <ChevronRight size={14} />}
        </button>
      ))}
    </div>
  </Drawer>
);

export const FilterDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeFilters: string[];
  toggleFilter: (f: string) => void;
}> = ({ isOpen, onClose, activeFilters, toggleFilter }) => {
  const categories = ['CONFLICT', 'MARITIME', 'CYBER', 'POLITICAL'];
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Target Filters">
      <div className="space-y-2">
        {categories.map(cat => (
          <label key={cat} className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all">
            <input
              type="checkbox"
              checked={activeFilters.includes(cat)}
              onChange={() => toggleFilter(cat)}
              className="accent-slate-500"
            />
            <span className="font-mono text-xs text-slate-300 uppercase tracking-widest">{cat}</span>
          </label>
        ))}
      </div>
    </Drawer>
  );
};

export const MenuDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
}> = ({ isOpen, onClose, logs }) => (
  <Drawer isOpen={isOpen} onClose={onClose} title="System Logs & Settings">
    <div className="space-y-6">
      <div className="space-y-2">
        <h4 className="font-mono text-[10px] text-slate-500 uppercase flex items-center gap-2">
          <Terminal size={12} /> Live API Downlink
        </h4>
        <div className="bg-slate-950 p-3 rounded border border-slate-800 h-64 overflow-y-auto font-mono text-[10px] text-slate-400 leading-relaxed custom-scrollbar">
          {logs.map((log, i) => (
            <div key={i} className="mb-1">
              <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
              {log}
            </div>
          ))}
          {logs.length === 0 && <div className="text-slate-800">NO ACTIVE LOGS</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <TacticalButton variant="secondary" className="justify-start">
          <Download size={14} /> Export SITREPs
        </TacticalButton>
        <TacticalButton variant="secondary" className="justify-start">
          <Settings size={14} /> System Config
        </TacticalButton>
      </div>
    </div>
  </Drawer>
);
