import React from 'react';
import { RefreshCw, LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon: LucideIcon;
  onReset: () => void;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, icon: Icon, onReset }) => (
  <div className="flex items-center justify-between mb-4 text-slate-400 border-b border-slate-700 pb-2">
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" /> 
      <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
    </div>
    <button 
      onClick={onReset}
      className="p-1 hover:text-emerald-400 hover:bg-slate-700 rounded transition-colors"
      title="Reset Section"
    >
      <RefreshCw className="w-3 h-3" />
    </button>
  </div>
);