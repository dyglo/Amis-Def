
import React from 'react';
import { ThreatLevel } from '../types';

interface ThreatGaugeProps {
  level: ThreatLevel;
  label: string;
}

export const ThreatGauge: React.FC<ThreatGaugeProps> = ({ level, label }) => {
  const getPercentage = () => {
    switch(level) {
      case ThreatLevel.LOW: return 25;
      case ThreatLevel.MEDIUM: return 50;
      case ThreatLevel.HIGH: return 75;
      case ThreatLevel.CRITICAL: return 100;
      default: return 0;
    }
  };

  const getColor = () => {
    switch(level) {
      case ThreatLevel.LOW: return '#10b981';
      case ThreatLevel.MEDIUM: return '#f59e0b';
      case ThreatLevel.HIGH: return '#ef4444';
      case ThreatLevel.CRITICAL: return '#7f1d1d';
      default: return '#334155';
    }
  };

  const percentage = getPercentage();
  const strokeDasharray = `${percentage} 100`;
  const color = getColor();

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="#1e293b"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={strokeDasharray}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-mono font-bold" style={{ color }}>{percentage}%</span>
        </div>
      </div>
      <span className="text-[8px] font-mono uppercase text-slate-500 mt-1 tracking-tighter">{label}</span>
    </div>
  );
};
