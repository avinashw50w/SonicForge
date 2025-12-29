import React from 'react';
import { Zap, RotateCcw, Headphones, Wind, LucideIcon } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface EffectsRackProps {
  reverse: boolean;
  spatial8d: boolean;
  reverb: boolean;
  onReverseChange: () => void;
  onSpatial8dChange: () => void;
  onReverbChange: () => void;
  onReset: () => void;
}

export const EffectsRack: React.FC<EffectsRackProps> = ({
  reverse, spatial8d, reverb,
  onReverseChange, onSpatial8dChange, onReverbChange, onReset
}) => {
  const Toggle = ({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon: LucideIcon }) => (
    <button 
      onClick={onClick}
      className={`flex items-center justify-between w-full p-3 rounded-lg border transition-all ${
        active 
          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Icon className="w-4 h-4" />
        {label}
      </span>
      <div className={`w-3 h-3 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'}`}></div>
    </button>
  );

  return (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 md:col-span-2">
      <SectionHeader title="FX Processors" icon={Zap} onReset={onReset} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Toggle 
          label="Reverse Audio" 
          active={reverse} 
          onClick={onReverseChange} 
          icon={RotateCcw}
        />
        <Toggle 
          label="8D Spatial Audio" 
          active={spatial8d} 
          onClick={onSpatial8dChange} 
          icon={Headphones}
        />
        <Toggle 
          label="Stadium Reverb" 
          active={reverb} 
          onClick={onReverbChange} 
          icon={Wind}
        />
      </div>
    </div>
  );
};