import React from 'react';
import { Sliders } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface EqualizerControlsProps {
  bass: number;
  mid: number;
  treble: number;
  onBassChange: (v: number) => void;
  onMidChange: (v: number) => void;
  onTrebleChange: (v: number) => void;
  onReset: () => void;
}

export const EqualizerControls: React.FC<EqualizerControlsProps> = ({
  bass, mid, treble,
  onBassChange, onMidChange, onTrebleChange, onReset
}) => {
  return (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
      <SectionHeader title="Equalizer" icon={Sliders} onReset={onReset} />
      <div className="flex justify-between px-4 h-32 items-end gap-4">
        {/* Vertical Sliders for EQ */}
        {[
          { label: 'Low', val: bass, set: onBassChange, color: 'accent-purple-500' },
          { label: 'Mid', val: mid, set: onMidChange, color: 'accent-blue-500' },
          { label: 'High', val: treble, set: onTrebleChange, color: 'accent-emerald-500' }
        ].map((band, idx) => (
          <div key={idx} className="flex flex-col items-center h-full gap-2 w-full">
            <input 
              type="range" 
              min={-12} max={12} step={1}
              value={band.val}
              onChange={e => band.set(Number(e.target.value))}
              className={`w-2 h-full -rotate-180 appearance-none bg-slate-900 rounded-full cursor-pointer ${band.color}`}
              style={{ WebkitAppearance: 'slider-vertical' }}
            />
            <span className="text-[10px] font-mono text-slate-500 uppercase">{band.label}</span>
            <span className="text-[10px] font-mono text-slate-300">{band.val > 0 ? `+${band.val}` : band.val}dB</span>
          </div>
        ))}
      </div>
    </div>
  );
};