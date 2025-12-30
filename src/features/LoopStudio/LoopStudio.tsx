import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Upload, Music, Play, Pause, Download, Activity, Clock, ListMusic, Star, FileAudio } from 'lucide-react';
import { analyzeAudioDSP } from '../../services/dspService';
import { AudioEngine } from '../../services/audioService';
import { processAudio, getFullUrl, downloadFile } from '../../services/apiService';
import { AnalysisResult, PlaybackState, LoopCategory } from '../../types';
import Waveform from '../../components/Waveform';
import { Button } from '../../components/Button';

const LoopStudio: React.FC = () => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [sourceAudioBuffer, setSourceAudioBuffer] = useState<AudioBuffer | null>(null); // Persistence for engine recreation
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false); // Track decoding status
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedLoopId, setSelectedLoopId] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  const [repeatCount, setRepeatCount] = useState<number>(4);
  const [isBuildingSong, setIsBuildingSong] = useState(false);
  const [generatedSongUrl, setGeneratedSongUrl] = useState<string | null>(null);
  const [generatedMp3Url, setGeneratedMp3Url] = useState<string | null>(null);
  const [isGeneratingMp3, setIsGeneratingMp3] = useState(false);
  
  // Scrubber State
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0); // Ref to track time during async operations/closures
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Refs
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedAudioRef = useRef<HTMLAudioElement>(null);
  const generatedSongBuffer = useRef<AudioBuffer | null>(null);

  // Helper to safely get or create AudioEngine
  const getAudioEngine = useCallback(() => {
    if (!audioEngineRef.current || audioEngineRef.current.isClosed()) {
        audioEngineRef.current = new AudioEngine();
    }
    return audioEngineRef.current;
  }, []);

  // Derived
  const currentLoop = useMemo(() => 
    analysisResult?.loops.find(l => l.id === selectedLoopId) || null
  , [analysisResult, selectedLoopId]);

  const featuredLoops = useMemo(() => 
    analysisResult?.loops.filter(l => l.category !== LoopCategory.CANDIDATE) || []
  , [analysisResult]);

  const candidateLoops = useMemo(() => 
    analysisResult?.loops.filter(l => l.category === LoopCategory.CANDIDATE) || []
  , [analysisResult]);

  // Animation Loop for Scrubber
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (!isScrubbing && playbackState === 'playing') {
        const engine = getAudioEngine();
        const time = engine.getCurrentTime();
        setCurrentTime(time);
        currentTimeRef.current = time;
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    if (playbackState === 'playing') {
      loop();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [playbackState, isScrubbing, getAudioEngine]);

  // Cleanup AudioEngine on unmount
  useEffect(() => {
    return () => {
        if (audioEngineRef.current) {
            audioEngineRef.current.stop();
            audioEngineRef.current.close();
        }
    };
  }, []);

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setAnalysisResult(null);
      setSelectedLoopId(null);
      setPlaybackState('stopped');
      setGeneratedSongUrl(null);
      setGeneratedMp3Url(null);
      setIsGeneratingMp3(false);
      generatedSongBuffer.current = null;
      setCurrentTime(0);
      currentTimeRef.current = 0;
      setSourceAudioBuffer(null);

      setIsDecoding(true); // Start decoding

      const engine = getAudioEngine();
      engine.stop();
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const decoded = await engine.decodeAudioData(arrayBuffer);
        setSourceAudioBuffer(decoded);
      } catch (err) {
        console.error("Error decoding audio:", err);
        alert("Failed to decode audio file.");
        setFile(null); // Reset file if decoding fails
      } finally {
        setIsDecoding(false); // End decoding
      }
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    try {
      const engine = getAudioEngine();
      
      // Reload buffer if lost (e.g. Strict Mode unmount/remount)
      if (!engine.getAudioBuffer() && sourceAudioBuffer) {
        engine.setAudioBuffer(sourceAudioBuffer);
      }

      const buffer = engine.getAudioBuffer();
      if (!buffer) throw new Error("Audio not loaded");
      
      const result = await analyzeAudioDSP(buffer);
      
      setAnalysisResult(result);
      if (result.loops.length > 0) {
        setSelectedLoopId(result.loops[0].id);
        setCurrentTime(result.loops[0].start);
        currentTimeRef.current = result.loops[0].start;
      }
    } catch (error) {
      alert("Failed to analyze audio.");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const togglePlayback = () => {
    const engine = getAudioEngine();

    if (playbackState === 'playing') {
      engine.stop();
      setPlaybackState('paused');
    } else {
      if (generatedAudioRef.current) {
        generatedAudioRef.current.pause();
      }

      if (currentLoop) {
        // Ensure buffer exists in engine
        if (!engine.getAudioBuffer() && sourceAudioBuffer) {
            engine.setAudioBuffer(sourceAudioBuffer);
        }

        // Use ref time for accurate restart
        const startPos = currentTimeRef.current; 
        engine.playLoop(currentLoop.start, currentLoop.end, startPos);
        setPlaybackState('playing');
      }
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    currentTimeRef.current = time;

    // Only force engine seek if not scrubbing to avoid glitching, OR if using specific logic.
    // Here we update engine on seek (click) but loop handles drag.
    if (playbackState === 'playing' && currentLoop && !isScrubbing) {
        const engine = getAudioEngine();
        if (!engine.getAudioBuffer() && sourceAudioBuffer) engine.setAudioBuffer(sourceAudioBuffer);
        engine.playLoop(currentLoop.start, currentLoop.end, time);
    }
  };

  const handleScrubberStart = () => {
    setIsScrubbing(true);
  };

  const handleScrubberEnd = () => {
    setIsScrubbing(false);
    // Use the REF value which is updated by handleSeek during drag
    const finalTime = currentTimeRef.current;
    
    if (currentLoop && playbackState === 'playing') {
        const engine = getAudioEngine();
        if (!engine.getAudioBuffer() && sourceAudioBuffer) engine.setAudioBuffer(sourceAudioBuffer);
        engine.playLoop(currentLoop.start, currentLoop.end, finalTime);
    }
  };

  const handleLoopSelect = (loopId: string) => {
    setSelectedLoopId(loopId);
    setPlaybackState('stopped'); 
    getAudioEngine().stop();
    const loop = analysisResult?.loops.find(l => l.id === loopId);
    if (loop) {
        setCurrentTime(loop.start);
        currentTimeRef.current = loop.start;
    }
  };

  const handleBuildSong = async () => {
    if (!currentLoop) return;
    setIsBuildingSong(true);
    if (generatedSongUrl) URL.revokeObjectURL(generatedSongUrl);
    if (generatedMp3Url) URL.revokeObjectURL(generatedMp3Url);
    setGeneratedSongUrl(null);
    setGeneratedMp3Url(null);
    setIsGeneratingMp3(false);
    generatedSongBuffer.current = null;

    try {
      const engine = getAudioEngine();
      if (!engine.getAudioBuffer() && sourceAudioBuffer) engine.setAudioBuffer(sourceAudioBuffer);

      const newBuffer = await engine.generateRepeatedLoop(
        currentLoop.start, 
        currentLoop.end, 
        repeatCount
      );
      
      generatedSongBuffer.current = newBuffer;

      const wavBlob = bufferToWave(newBuffer, newBuffer.length);
      const urlWav = URL.createObjectURL(wavBlob);
      setGeneratedSongUrl(urlWav);

    } catch (e) {
      console.error(e);
      alert("Error building song");
    } finally {
      setIsBuildingSong(false);
    }
  };

  const handleGenerateMp3 = async () => {
    if (!generatedSongBuffer.current) return;
    setIsGeneratingMp3(true);

    try {
      // 1. Convert AudioBuffer to WAV Blob
      const wavBlob = bufferToWave(generatedSongBuffer.current, generatedSongBuffer.current.length);
      
      // 2. Create a temporary File object to upload
      const fileName = (file?.name || 'audio').replace(/\.[^/.]+$/, "") + "_loop.wav";
      const wavFile = new File([wavBlob], fileName, { type: "audio/wav" });

      // 3. Send to backend for MP3 conversion (process-single defaults to mp3 output)
      const result = await processAudio(wavFile, {}); 
      const urlMp3 = getFullUrl(result.url);
      
      setGeneratedMp3Url(urlMp3);
    } catch (e) {
      console.error("MP3 Generation failed", e);
      alert("Failed to generate MP3 via server");
    } finally {
      setIsGeneratingMp3(false);
    }
  };

  const getDownloadFilename = (extension: string) => {
    const fileName = file?.name || 'audio';
    const baseName = fileName.replace(/\.[^/.]+$/, "");
    const category = currentLoop?.category.toLowerCase() || 'loop';
    return `${baseName}_${category}_loop${repeatCount}.${extension}`;
  };

  const bufferToWave = (abuffer: AudioBuffer, len: number) => {
    let numOfChan = abuffer.numberOfChannels;
    let length = len * numOfChan * 2 + 44;
    let buffer = new ArrayBuffer(length);
    let view = new DataView(buffer);
    let channels = [], i, sample;
    let offset = 0;
    let pos = 0;
    setUint32(0x46464952);
    setUint32(length - 8);
    setUint32(0x45564157);
    setUint32(0x20746d66);
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164);
    setUint32(length - pos - 4);
    for(i = 0; i < abuffer.numberOfChannels; i++)
      channels.push(abuffer.getChannelData(i));
    while(pos < len) {
      for(i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][pos]));
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0;
        view.setInt16(44 + offset, sample, true);
        offset += 2;
      }
      pos++;
    }
    return new Blob([buffer], {type: "audio/wav"});
    function setUint16(data: any) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data: any) { view.setUint32(pos, data, true); pos += 4; }
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const LoopCard = ({ loop }: { loop: any }) => (
    <div 
      onClick={() => handleLoopSelect(loop.id)}
      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
        selectedLoopId === loop.id 
          ? 'bg-emerald-900/30 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex justify-between items-center">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
          loop.category === LoopCategory.ORIGINAL ? 'bg-purple-500/20 text-purple-300' :
          loop.category === LoopCategory.BEST ? 'bg-amber-500/20 text-amber-300' :
          loop.category === LoopCategory.CANDIDATE ? 'bg-slate-600/50 text-slate-300' :
          'bg-blue-500/20 text-blue-300'
        }`}>
          {loop.category}
        </span>
        <span className="text-xs text-slate-500 font-mono">
          {formatTime(loop.start)} - {formatTime(loop.end)}
        </span>
      </div>
      <p className="text-xs text-slate-400 truncate">{loop.description}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
          <div className="p-3 bg-emerald-600 rounded-lg shadow-lg shadow-emerald-500/20">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Loop Genius</h1>
            <p className="text-slate-400">Intelligent Loop Extraction & Song Builder</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Upload Section if no file */}
      {!file && (
        <div className="lg:col-span-12">
            <input 
                type="file" 
                accept="audio/*" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
            />
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-600 rounded-xl p-12 cursor-pointer hover:border-emerald-500 hover:bg-slate-800 transition-colors group text-center"
            >
              <Upload className="w-12 h-12 mx-auto text-slate-500 group-hover:text-emerald-500 mb-4 transition-colors" />
              <h3 className="text-lg font-medium text-slate-200">Upload Audio for Loop Analysis</h3>
              <p className="text-slate-400 mt-2 text-sm">MP3, WAV, AAC supported</p>
            </div>
        </div>
      )}

      {/* File Header */}
      {file && (
        <div className="lg:col-span-12 flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-slate-700">
            <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-emerald-400" />
            <div className="text-left">
                <p className="font-medium truncate max-w-xs">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            </div>
            </div>
            <div className="flex gap-2">
            <Button 
                variant="ghost" 
                onClick={() => {
                    setFile(null); 
                    setAnalysisResult(null);
                    setPlaybackState('stopped');
                    setSourceAudioBuffer(null);
                    setGeneratedSongUrl(null);
                }}
            >
                Change File
            </Button>
            {!analysisResult && (
                <Button 
                    onClick={handleAnalyze} 
                    isLoading={isAnalyzing || isDecoding} 
                    disabled={isDecoding}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                >
                <Activity className="w-4 h-4" />
                {isDecoding ? 'Decoding...' : 'Process Audio'}
                </Button>
            )}
            </div>
        </div>
      )}

      {/* Main Content */}
      {analysisResult && currentLoop && (
        <>
            {/* Left Col - Loop List */}
            <div className="lg:col-span-4 space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                <h2 className="text-sm uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400" />
                  Top Picks
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {featuredLoops.map((loop) => (
                    <LoopCard key={loop.id} loop={loop} />
                  ))}
                </div>
              </div>
              <div className="w-full h-px bg-slate-800 my-4"></div>
              <div className="space-y-3">
                 <h2 className="text-sm uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-2">
                  <ListMusic className="w-4 h-4 text-emerald-400" />
                  All Candidates ({candidateLoops.length})
                </h2>
                <div className="grid grid-cols-1 gap-2">
                  {candidateLoops.map((loop) => (
                    <LoopCard key={loop.id} loop={loop} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col - Controls (Sticky Wrapper) */}
            <div className="lg:col-span-8">
              <div className="sticky top-6 space-y-8">
                  {/* Loop Preview Box */}
                  <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6 shadow-lg">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Loop Preview</h3>
                        <div className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTime(currentTime)} / {formatTime(currentLoop.end)}
                        </div>
                    </div>
                    <div className="relative">
                        <Waveform 
                            audioBuffer={sourceAudioBuffer} 
                            loopStart={currentLoop.start} 
                            loopEnd={currentLoop.end} 
                            currentTime={currentTime}
                            onSeek={handleSeek}
                            onScrubStart={handleScrubberStart}
                            onScrubEnd={handleScrubberEnd}
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
                            <span>{formatTime(currentLoop.start)}</span>
                            <span>{formatTime(currentLoop.end)}</span>
                        </div>
                    </div>
                    <div className="flex justify-center pt-2">
                        <Button 
                            onClick={togglePlayback} 
                            className="rounded-full w-16 h-16 p-0 flex items-center justify-center !text-xl bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 transform-gpu transition-transform duration-200 hover:scale-105"
                        >
                            {playbackState === 'playing' ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                        </Button>
                    </div>
                  </div>

                  {/* Song Builder Box */}
                  <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">Loop Song Builder</h3>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Repetitions (n)
                            </label>
                            <input 
                                type="number" 
                                min="1" 
                                max="100" 
                                value={repeatCount}
                                onChange={(e) => setRepeatCount(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                            />
                        </div>
                        <Button 
                            onClick={handleBuildSong} 
                            isLoading={isBuildingSong}
                            className="w-full md:w-auto"
                            variant="secondary"
                        >
                            <Music className="w-4 h-4" />
                            Generate Song
                        </Button>
                    </div>

                    {generatedSongUrl && (
                        <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-emerald-500/30">
                            <h4 className="text-sm font-medium text-emerald-300 mb-3">Song Ready!</h4>
                            <audio 
                              ref={generatedAudioRef}
                              controls 
                              src={generatedSongUrl} 
                              className="w-full mb-3 h-8" 
                              onPlay={() => {
                                setPlaybackState('paused');
                                getAudioEngine().stop();
                              }}
                            />
                            <div className="flex gap-4">
                              <a 
                                  href={generatedSongUrl} 
                                  download={getDownloadFilename('wav')}
                                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium bg-slate-800 px-4 py-2 rounded-lg border border-emerald-900 hover:border-emerald-500 transition-colors"
                              >
                                  <Download className="w-4 h-4" />
                                  Download WAV
                              </a>
                              {!generatedMp3Url ? (
                                <Button onClick={handleGenerateMp3} isLoading={isGeneratingMp3} variant="ghost" className="!text-blue-400 !border-blue-900/50">
                                    <FileAudio className="w-4 h-4" /> Convert to MP3
                                </Button>
                              ) : (
                                <Button 
                                    onClick={() => downloadFile(generatedMp3Url!, getDownloadFilename('mp3'))}
                                    variant="ghost" 
                                    className="!text-blue-400 !border-blue-900/50"
                                >
                                    <FileAudio className="w-4 h-4" /> Download MP3
                                </Button>
                              )}
                            </div>
                        </div>
                    )}
                  </div>
              </div>
            </div>
        </>
      )}
      </div>
    </div>
  );
};

export default LoopStudio;