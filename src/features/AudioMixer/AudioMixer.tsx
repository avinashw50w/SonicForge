import React, { useState } from 'react';
import { Button } from '../../components/Button';
import { processMultiAudio, getFullUrl } from '../../services/apiService';
import { Layers, ListPlus, Music, Download, Trash2 } from 'lucide-react';

const AudioMixer: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'join' | 'mix'>('join');

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleProcess = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setProcessedUrl(null);
    try {
      const result = await processMultiAudio(files, mode);
      setProcessedUrl(getFullUrl(result.url));
    } catch (err) {
      alert("Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Tracks ({files.length})</h3>
                    <label className="cursor-pointer bg-slate-700 px-3 py-1 rounded text-sm hover:bg-slate-600 transition-colors">
                        Add Files
                        <input type="file" multiple accept="audio/*" className="hidden" onChange={handleFileAdd} />
                    </label>
                </div>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {files.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No files added yet.</p>}
                    {files.map((f, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-900 p-2 rounded border border-slate-800">
                            <div className="flex items-center gap-2 truncate">
                                <span className="text-xs text-slate-500 w-5">{i+1}.</span>
                                <span className="text-sm truncate max-w-[150px]">{f.name}</span>
                            </div>
                            <button onClick={() => removeFile(i)} className="text-slate-500 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-4">
                <h3 className="font-semibold">Operation Mode</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => setMode('join')}
                        className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'join' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                    >
                        <ListPlus className="w-6 h-6" />
                        <span className="font-medium">Join (Sequence)</span>
                        <span className="text-[10px] opacity-70">Play one after another</span>
                    </button>
                    <button 
                        onClick={() => setMode('mix')}
                        className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${mode === 'mix' ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-slate-900 border-slate-700 hover:border-slate-600'}`}
                    >
                        <Layers className="w-6 h-6" />
                        <span className="font-medium">Mix (Overlay)</span>
                        <span className="text-[10px] opacity-70">Play all together</span>
                    </button>
                </div>
                <Button onClick={handleProcess} disabled={files.length < 2} isLoading={isProcessing} className="w-full mt-4">
                    Process Audio
                </Button>
            </div>
        </div>

        {/* Output Section */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center">
             {processedUrl ? (
                <div className="text-center space-y-4 w-full animate-in fade-in">
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto text-white">
                        <Music className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-medium">Mix Complete!</h3>
                    <audio controls src={processedUrl} className="w-full" />
                    <a href={processedUrl} download className="inline-block">
                        <Button variant="primary">
                            <Download className="w-4 h-4" /> Download Result
                        </Button>
                    </a>
                </div>
            ) : (
                <div className="text-slate-500 text-center opacity-50">
                    <Layers className="w-16 h-16 mx-auto mb-4" />
                    <p>Add files and select a mode to begin</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AudioMixer;