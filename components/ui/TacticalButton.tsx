
import React from 'react';

interface TacticalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export const TacticalButton: React.FC<TacticalButtonProps> = ({ 
  children, 
  onClick, 
  variant = 'primary',
  className = ''
}) => {
  const baseStyles = "px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500",
    secondary: "border-slate-500/50 bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 hover:border-slate-500",
    danger: "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500"
  };

  return (
    <button 
      onClick={onClick}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse mr-2" />
      {children}
    </button>
  );
};
