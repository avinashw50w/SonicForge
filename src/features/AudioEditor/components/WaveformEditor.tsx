import React from 'react';
import Waveform from '../../../components/Waveform';
import { Activity, Play, Pause } from 'lucide-react';

interface WaveformEditorProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
  onSeek: (t: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  onTrimStartChange: (t: number) => void;
  onTrimEndChange: (t: number) => void;
  onTogglePlayback: () => void;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({
  audioBuffer,
  currentTime,
  duration,
  trimStart,
  trimEnd,
  isPlaying,
  onSeek,
  onScrubStart,
  onScrubEnd,
  onTrimStartChange,
  onTrimEndChange,
  onTogglePlayback
}) => {
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;
  };

  return (
    <div className="lg:col-span-12 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 opacity-50"></div>
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" /> Waveform & Trim
        </h3>
        <div className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">
          {formatTime(currentTime)}
        </div>
      </div>

      <div className="mb-6 relative group">
        {audioBuffer && (
          <Waveform 
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            loopStart={trimStart}
            loopEnd={trimEnd}
            onSeek={onSeek}
            onScrubStart={onScrubStart}
            onScrubEnd={onScrubEnd}
          />
        )}
      </div>

      {/* Trimmer Controls */}
      <div className="grid grid-cols-2 gap-8 px-4">
        <div>
          <label className="flex justify-between text-xs text-slate-400 mb-2 font-mono items-center">
            <span>Trim Start (s)</span>
            <input 
              type="number"
              step="0.01"
              min="0"
              max={duration}
              value={trimStart.toFixed(2)}
              onChange={(e) => onTrimStartChange(parseFloat(e.target.value) || 0)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-right text-xs text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50"
            />
          </label>
          <input 
            type="range" 
            min={0} max={duration} step={0.01}
            value={trimStart}
            onChange={(e) => onTrimStartChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
        <div>
          <label className="flex justify-between text-xs text-slate-400 mb-2 font-mono items-center">
            <span>Trim End (s)</span>
            <input 
              type="number"
              step="0.01"
              min="0"
              max={duration}
              value={trimEnd.toFixed(2)}
              onChange={(e) => onTrimEndChange(parseFloat(e.target.value) || 0)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 w-20 text-right text-xs text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50"
            />
          </label>
          <input 
            type="range" 
            min={0} max={duration} step={0.01}
            value={trimEnd}
            onChange={(e) => onTrimEndChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <button 
          onClick={onTogglePlayback}
          className="w-14 h-14 bg-white text-slate-900 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200 transform-gpu shadow-lg shadow-white/10"
        >
          {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
        </button>
      </div>
    </div>
  );
};