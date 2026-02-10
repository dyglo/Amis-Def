
import React, { useEffect, useState } from 'react';
import { Sitrep, ThreatLevel } from '../types';
import { useIntelligence } from '../hooks/useIntelligence';
import { TerminalText } from './ui/TerminalText';
import { ThreatGauge } from './ThreatGauge';
import { TacticalButton } from './ui/TacticalButton';
import { ChevronRight, ExternalLink, ShieldAlert, Cpu, Globe, MapPin, Eye } from 'lucide-react';
import { GroundTruthViewer } from './GroundTruthViewer';

interface IntelligencePanelProps {
  selectedSitrep: Sitrep | null;
  onClose: () => void;
  onEnterRecon: (sitrep: Sitrep) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({ selectedSitrep, onClose, onEnterRecon }) => {
  const { loading, error, performAnalysis, getAnalysis } = useIntelligence();
  const analysis = getAnalysis(selectedSitrep?.id);

  useEffect(() => {
    if (selectedSitrep) {
      performAnalysis(selectedSitrep);
    }
  }, [selectedSitrep, performAnalysis]);

  if (!selectedSitrep) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center text-slate-500 font-mono text-sm border-l border-slate-800 bg-slate-950/50">
        <div className="space-y-4">
          <Globe className="mx-auto w-12 h-12 opacity-20 animate-pulse" />
          <p>SELECT SECTOR NODE FOR GEOPOLITICAL DOWNLINK</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border-l border-emerald-500/20 bg-[#020202]/90 backdrop-blur-xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-emerald-500/10 flex items-center justify-between bg-emerald-500/5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
          <h2 className="font-mono font-bold text-emerald-400 text-sm tracking-widest uppercase">
            Tactical Intel: {selectedSitrep.id}
          </h2>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-emerald-400 transition-colors">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Ground Truth Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Eye size={14} className="text-emerald-500" /> Ground Recon Preview
            </h4>
            <button
              onClick={() => onEnterRecon(selectedSitrep)}
              className="text-[9px] font-mono text-emerald-400 hover:underline flex items-center gap-1"
            >
              IMMERSIVE RECON <ChevronRight size={10} />
            </button>
          </div>
          <GroundTruthViewer coordinates={selectedSitrep.coordinates} autoRotate />
        </section>

        {/* Core Info */}
        <section className="space-y-3">
          <h3 className="text-xl font-bold text-white tracking-tight">{selectedSitrep.title}</h3>
          <div className="flex gap-4 items-start">
            <ThreatGauge level={selectedSitrep.threatLevel} label="Threat Vector" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                <span>Coordinates</span>
                <span className="text-emerald-500 flex items-center gap-1"><MapPin size={8} /> {selectedSitrep.coordinates.join(' , ')}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                <span>Timestamp</span>
                <span>{new Date(selectedSitrep.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                <span>Category</span>
                <span className="text-emerald-500">{selectedSitrep.category}</span>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed font-mono mt-4 border-l-2 border-emerald-500/30 pl-4 bg-emerald-500/5 py-2">
            {selectedSitrep.description}
          </p>
        </section>

        {/* AI Deep Analysis */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <h4 className="font-mono text-xs text-emerald-400 uppercase tracking-widest">Strategic Deep Analysis (2020-Present)</h4>
          </div>

          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-full"></div>
              <div className="h-20 bg-slate-800 rounded w-full"></div>
              <div className="h-10 bg-slate-800 rounded w-full"></div>
            </div>
          ) : error ? (
            <div className="p-4 border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono">
              {error}
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Geopolitical implications</span>
                <TerminalText text={analysis.geopoliticalImplications} speed={10} className="text-xs text-slate-300" />
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Recommended Response</span>
                <TerminalText text={analysis.recommendedResponse} speed={15} className="text-xs text-emerald-400/80" />
              </div>

              {analysis.links.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase">Grounding Sources</span>
                  <div className="flex flex-wrap gap-2">
                    {analysis.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.uri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 hover:bg-emerald-500/20 text-[10px] font-mono text-slate-400 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/50 transition-all rounded"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {link.title.substring(0, 20)}...
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {/* Entity Linker */}
        <section className="space-y-4">
          <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest">Extracted Entities</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-slate-600 uppercase">People / Key Personnel</span>
              <div className="flex flex-wrap gap-1">
                {selectedSitrep.entities.people.length > 0 ? selectedSitrep.entities.people.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300 rounded">{p}</span>
                )) : <span className="text-[10px] font-mono text-slate-700">None detected</span>}
              </div>
            </div>
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-slate-600 uppercase">Organizations</span>
              <div className="flex flex-wrap gap-1">
                {selectedSitrep.entities.orgs.length > 0 ? selectedSitrep.entities.orgs.map((o, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-900 border border-emerald-500/20 text-[10px] font-mono text-emerald-500/70 rounded">{o}</span>
                )) : <span className="text-[10px] font-mono text-slate-700">None detected</span>}
              </div>
            </div>
          </div>
        </section>

        <div className="pt-8 space-y-3">
          <TacticalButton variant="primary" className="w-full" onClick={() => onEnterRecon(selectedSitrep)}>
            Initiate Street-Level Recon
          </TacticalButton>
          <TacticalButton variant="danger" className="w-full">
            Log Deployment Protocols
          </TacticalButton>
        </div>
      </div>
    </div>
  );
};
