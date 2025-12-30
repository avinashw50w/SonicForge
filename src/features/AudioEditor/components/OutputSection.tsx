import React from 'react';
import { Button } from '../../../components/Button';
import { Zap, Music, Download, Infinity } from 'lucide-react';
import { downloadFile } from '../../../services/apiService';

interface OutputSectionProps {
  isProcessing: boolean;
  processedUrl: string | null;
  onProcess: () => void;
  originalFilename?: string;
}

const OutputSection: React.FC<OutputSectionProps> = ({ isProcessing, processedUrl, onProcess, originalFilename }) => {
  const getDownloadName = () => {
    if (!originalFilename) return 'remix.mp3';
    // Remove extension
    const base = originalFilename.replace(/\.[^/.]+$/, "");
    return `${base}_remix.mp3`;
  };

  return (
    <div className="lg:col-span-4 flex flex-col gap-6">
      <Button 
        onClick={onProcess} 
        isLoading={isProcessing}
        className="w-full h-16 text-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] border-0"
      >
        <Zap className="w-5 h-5 mr-2" />
        Render Effects
      </Button>

      <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 p-6 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden">
        {processedUrl ? (
          <div className="relative z-10 w-full text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-4 animate-pulse">
              <Music className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white">Master Ready</h3>
            <p className="text-sm text-slate-400">Processing complete.</p>
            
            <audio controls src={processedUrl} className="w-full mt-4" />
            
            <Button 
                variant="secondary" 
                className="w-full mt-4"
                onClick={() => downloadFile(processedUrl, getDownloadName())}
            >
              <Download className="w-4 h-4" /> Download MP3
            </Button>
          </div>
        ) : (
          <div className="text-center text-slate-600">
            <Infinity className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Output will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutputSection;
