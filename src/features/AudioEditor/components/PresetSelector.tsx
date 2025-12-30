
import React from 'react';
import { Zap, Clock, Music, Wind, Rabbit, Infinity, Phone, Waves, LucideIcon } from 'lucide-react';

interface PresetButtonProps {
  id: string;
  label: string;
  icon: LucideIcon;
  activePreset: string | null;
  onSelectPreset: (id: string) => void;
}

const PresetButton: React.FC<PresetButtonProps> = ({ id, label, icon: Icon, activePreset, onSelectPreset }) => (
  <button
    onClick={() => onSelectPreset(id)}
    className={`
      flex items-center gap-2 px-4 py-3 rounded-lg border transition-colors duration-200 text-xs font-medium whitespace-nowrap
      ${activePreset === id 
        ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200'
      }
    `}
  >
    <Icon className="w-3 h-3" />
    {label}
  </button>
);

interface PresetSelectorProps {
  activePreset: string | null;
  onSelectPreset: (id: string) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ activePreset, onSelectPreset }) => {
  return (
    <div className="lg:col-span-12">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Presets</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <PresetButton id="nightcore" label="Nightcore" icon={Zap} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="slowed" label="Slowed" icon={Clock} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="bassboost" label="Bass Boost" icon={Music} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="helium" label="Helium" icon={Wind} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="chipmunk" label="Chipmunk" icon={Rabbit} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="vaporwave" label="Vaporwave" icon={Infinity} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="telephone" label="Telephone" icon={Phone} activePreset={activePreset} onSelectPreset={onSelectPreset} />
        <PresetButton id="underwater" label="Underwater" icon={Waves} activePreset={activePreset} onSelectPreset={onSelectPreset} />
      </div>
    </div>
  );
};
