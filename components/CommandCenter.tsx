
import React, { useState, useEffect } from 'react';
import { Activity, Radio, Wifi, Zap, Lock, Grid, Satellite, Users, Waves } from 'lucide-react';

type FeedStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';

interface FeedInfo {
  name: string;
  status: FeedStatus;
  icon: React.ElementType;
}

export const CommandCenter: React.FC = () => {
  const [latency, setLatency] = useState(14);
  const [timestamp, setTimestamp] = useState(new Date().toISOString());
  const [feeds, setFeeds] = useState<FeedInfo[]>([
    { name: 'SIGINT', status: 'ONLINE', icon: Waves },
    { name: 'GEOINT', status: 'ONLINE', icon: Satellite },
    { name: 'HUMINT', status: 'ONLINE', icon: Users },
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(Math.floor(Math.random() * 15) + 10);
      setTimestamp(new Date().toISOString());

      // Randomly fluctuate feed status for realism
      if (Math.random() > 0.8) {
        setFeeds(prev => prev.map(feed => {
          if (Math.random() > 0.9) {
            const statuses: FeedStatus[] = ['ONLINE', 'DEGRADED', 'OFFLINE'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            return { ...feed, status: newStatus };
          }
          return feed;
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status: FeedStatus) => {
    switch (status) {
      case 'ONLINE': return 'text-emerald-500';
      case 'DEGRADED': return 'text-amber-500';
      case 'OFFLINE': return 'text-red-500';
      default: return 'text-slate-500';
    }
  };

  const getDotColor = (status: FeedStatus) => {
    switch (status) {
      case 'ONLINE': return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]';
      case 'DEGRADED': return 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]';
      case 'OFFLINE': return 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]';
      default: return 'bg-slate-500';
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-[1100] h-14 border-b border-emerald-500/20 bg-slate-950/70 backdrop-blur-md px-6 flex items-center justify-between">
      {/* Platform Branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Grid className="w-8 h-8 text-emerald-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse"></div>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white leading-none">AEGIS-GRID</h1>
            <p className="text-[8px] font-mono text-emerald-500 tracking-[0.3em] uppercase opacity-70">Defense Intel Platform</p>
          </div>
        </div>
        
        <div className="h-8 w-px bg-slate-800 mx-2" />
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase">Network Status</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] font-mono text-emerald-400">OPTIMIZED</span>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-slate-500 uppercase">Uplink Latency</span>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-mono text-emerald-400">{latency}MS</span>
            </div>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-800 mx-2 hidden xl:block" />

        {/* Data Feeds Section */}
        <div className="hidden xl:flex items-center gap-6">
          {feeds.map(feed => (
            <div key={feed.name} className="flex flex-col">
              <span className="text-[8px] font-mono text-slate-500 uppercase flex items-center gap-1">
                <feed.icon size={8} className="opacity-70" /> {feed.name}
              </span>
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${getDotColor(feed.status)}`} />
                <span className={`text-[9px] font-mono font-bold uppercase ${getStatusColor(feed.status)}`}>
                  {feed.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Metadata */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 text-slate-400">
           <div className="flex flex-col items-end">
             <span className="text-[8px] font-mono uppercase tracking-widest text-slate-600">Surveillance Grid</span>
             <span className="text-[10px] font-mono">SECTOR 04 - OMEGA</span>
           </div>
           <div className="flex flex-col items-end min-w-[140px]">
             <span className="text-[8px] font-mono uppercase tracking-widest text-slate-600">System Clock (UTC)</span>
             <span className="text-[10px] font-mono text-emerald-400/80">{timestamp.split('T')[1].split('.')[0]}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 border border-slate-800 bg-slate-900/50 hover:bg-slate-800 cursor-pointer transition-colors group">
            <Radio className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
          </div>
          <div className="p-2 border border-slate-800 bg-slate-900/50 hover:bg-slate-800 cursor-pointer transition-colors group">
            <Lock className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
          </div>
          <div className="p-2 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer transition-colors group">
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>
    </header>
  );
};
