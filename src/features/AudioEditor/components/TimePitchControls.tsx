import React from 'react';
import { Clock } from 'lucide-react';
import { RangeSlider } from '../../../components/RangeSlider';
import { SectionHeader } from './SectionHeader';

interface TimePitchControlsProps {
  speed: number;
  pitch: number;
  volume: number;
  fadeIn: number;
  onSpeedChange: (v: number) => void;
  onPitchChange: (v: number) => void;
  onVolumeChange: (v: number) => void;
  onFadeInChange: (v: number) => void;
  onReset: () => void;
}

export const TimePitchControls: React.FC<TimePitchControlsProps> = ({
  speed, pitch, volume, fadeIn,
  onSpeedChange, onPitchChange, onVolumeChange, onFadeInChange, onReset
}) => {
  return (
    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex flex-col justify-between">
      <SectionHeader title="Time & Pitch" icon={Clock} onReset={onReset} />
      <div className="space-y-4">
        <RangeSlider 
          label="Speed" 
          value={speed} 
          min={0.5} 
          max={2.0} 
          step={0.05} 
          onChange={onSpeedChange} 
          formatValue={(v) => `${v.toFixed(2)}x`}
        />
        <RangeSlider 
          label="Pitch" 
          value={pitch} 
          min={0.5} 
          max={2.0} 
          step={0.05} 
          onChange={onPitchChange}
          formatValue={(v) => `${v.toFixed(2)}x`}
        />
        <RangeSlider 
          label="Volume" 
          value={volume} 
          min={0} 
          max={2.0} 
          step={0.1} 
          onChange={onVolumeChange}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <RangeSlider 
          label="Fade In (seconds)" 
          value={fadeIn} 
          min={0} 
          max={10} 
          step={0.5} 
          onChange={onFadeInChange} 
        />
      </div>
    </div>
  );
};