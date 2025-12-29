import React, { useState, useRef } from 'react';
import { Button } from '../../components/Button';
import { extractAudioFromVideo, getFullUrl } from '../../services/apiService';
import { Video, FileAudio, ArrowRight, Download } from 'lucide-react';

const VideoExtractor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ url: string, filename: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      setResult(null);
      try {
        const res = await extractAudioFromVideo(e.target.files[0]);
        setResult({ url: getFullUrl(res.url), filename: res.filename });
      } catch (err) {
        alert("Extraction failed.");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto text-center space-y-12 py-12">
        <div className="space-y-4">
            <h2 className="text-3xl font-bold">Extract Audio from Video</h2>
            <p className="text-slate-400">Upload MP4, MOV, or AVI. Get high-quality MP3 instantly.</p>
        </div>

        <div className="flex items-center justify-center gap-8">
            <div className="p-6 bg-slate-800 rounded-2xl border border-slate-700">
                <Video className="w-12 h-12 text-slate-400" />
            </div>
            <ArrowRight className="w-8 h-8 text-slate-600" />
            <div className="p-6 bg-emerald-900/20 rounded-2xl border border-emerald-500/30">
                <FileAudio className="w-12 h-12 text-emerald-400" />
            </div>
        </div>

        <div className="space-y-6">
            {!result ? (
                <div>
                    <input 
                      type="file" 
                      accept="video/*" 
                      id="video-upload" 
                      className="hidden" 
                      onChange={handleUpload} 
                      ref={fileInputRef}
                    />
                    <Button 
                      isLoading={isProcessing} 
                      className="px-8 py-4 text-lg cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                        Select Video File
                    </Button>
                </div>
            ) : (
                <div className="bg-emerald-900/10 p-8 rounded-xl border border-emerald-500/20 space-y-4 animate-in fade-in zoom-in-95">
                    <h3 className="text-xl font-semibold text-emerald-400">Success!</h3>
                    <p className="text-slate-300">{result.filename}</p>
                    <audio controls src={result.url} className="w-full max-w-md mx-auto" />
                    <div className="pt-4">
                        <a href={result.url} download={result.filename}>
                            <Button variant="primary">
                                <Download className="w-4 h-4" /> Download MP3
                            </Button>
                        </a>
                        <button onClick={() => setResult(null)} className="block mx-auto mt-4 text-sm text-slate-500 hover:text-white">
                            Convert Another
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default VideoExtractor;