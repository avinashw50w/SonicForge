import React from 'react';
import { Music, RotateCcw, Settings2 } from 'lucide-react';
import { Button } from '../../../components/Button';

interface EditorHeaderProps {
  file: File | null;
  duration: number;
  onClose: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ file, duration, onClose, onUpload }) => {
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;
  };

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50 hover:bg-slate-800/50 transition-colors">
        <input 
          type="file" 
          accept="audio/*" 
          className="hidden" 
          id="editor-upload"
          onChange={onUpload}
        />
        <label htmlFor="editor-upload" className="cursor-pointer text-center p-12">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-700">
            <Settings2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-200">Audio Studio</h3>
          <p className="text-slate-400 mt-2 max-w-sm mx-auto">Upload a track to access professional effects: EQ, Pitch, Speed, 8D Audio, and more.</p>
          <div className="mt-8">
            <Button className="mx-auto pointer-events-none">Select Audio File</Button>
          </div>
        </label>
      </div>
    );
  }

  return (
    <div className="lg:col-span-12 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
      <div className="flex items-center gap-4 w-full md:w-auto overflow-hidden">
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <Music className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <h2 className="font-bold text-lg truncate">{file.name}</h2>
          <p className="text-xs text-slate-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB • {formatTime(duration)}</p>
        </div>
      </div>
      
      <button 
        onClick={onClose}
        className="text-slate-500 hover:text-red-400 p-2 flex items-center gap-2"
        title="Close File"
      >
        <RotateCcw className="w-4 h-4" />
        <span className="text-sm">Close</span>
      </button>
    </div>
  );
};