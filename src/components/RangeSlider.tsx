import React from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  formatValue?: (val: number) => string;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label, value, min, max, step = 1, onChange, formatValue
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{label}</span>
        <span>{formatValue ? formatValue(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
    </div>
  );
};