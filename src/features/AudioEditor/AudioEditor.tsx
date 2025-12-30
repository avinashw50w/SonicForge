
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { processAudio, getFullUrl, cleanupFiles } from '../../services/apiService';
import { AudioEngine } from '../../services/audioService';

// Sub-components
import { EditorHeader } from './components/EditorHeader';
import { WaveformEditor } from './components/WaveformEditor';
import { PresetSelector } from './components/PresetSelector';
import { TimePitchControls } from './components/TimePitchControls';
import { EqualizerControls } from './components/EqualizerControls';
import { EffectsRack } from './components/EffectsRack';
import OutputSection from './components/OutputSection';

const AudioEditor: React.FC = () => {
  // --- State ---
  const [file, setFile] = useState<File | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [serverFiles, setServerFiles] = useState<{upload?: string, processed?: string}>({});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  
  // Audio Engine Lifecycle Management
  const audioEngineRef = useRef<AudioEngine | null>(null);
  
  const getAudioEngine = useCallback(() => {
    if (!audioEngineRef.current || audioEngineRef.current.isClosed()) {
        audioEngineRef.current = new AudioEngine();
    }
    return audioEngineRef.current;
  }, []);

  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Refs to track state synchronously for the animation loop
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isScrubbingRef = useRef(false);
  
  const [isScrubbing, setIsScrubbing] = useState(false);
  const requestRef = useRef<number>(null);

  // Parameters
  const [volume, setVolume] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [speed, setSpeed] = useState(1);
  
  // Trimming
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30); 
  const [duration, setDuration] = useState(0);

  // Effects
  const [fadeIn, setFadeIn] = useState(0);
  const [reverse, setReverse] = useState(false);
  const [spatial8d, setSpatial8d] = useState(false);
  const [reverb, setReverb] = useState(false);
  const [enhanced, setEnhanced] = useState(false);

  // EQ
  const [eqBass, setEqBass] = useState(0);
  const [eqMid, setEqMid] = useState(0);
  const [eqTreble, setEqTreble] = useState(0);

  // --- Real-time Parameter Updates ---
  useEffect(() => {
     const engine = getAudioEngine();
     engine.setVolume(volume);
  }, [volume, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setPitch(pitch);
  }, [pitch, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setSpeed(speed);
  }, [speed, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setEQ(eqBass, eqMid, eqTreble);
  }, [eqBass, eqMid, eqTreble, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setReverb(reverb);
  }, [reverb, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setReverse(reverse);
  }, [reverse, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setSpatial8d(spatial8d);
  }, [spatial8d, getAudioEngine]);

  useEffect(() => {
     const engine = getAudioEngine();
     engine.setEnhanced(enhanced);
  }, [enhanced, getAudioEngine]);

  // --- Lifecycle Cleanup ---
  useEffect(() => {
    return () => {
      if (audioEngineRef.current) {
          audioEngineRef.current.stop();
          audioEngineRef.current.close();
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Sync refs with state for UI consistency, though logic relies on refs
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { isScrubbingRef.current = isScrubbing; }, [isScrubbing]);

  const updateTime = useCallback(() => {
    // If scrubbing, we skip updating time from engine so we don't fight the user's drag
    if (isScrubbingRef.current) {
        if (isPlayingRef.current) {
             requestRef.current = requestAnimationFrame(updateTime);
        }
        return;
    }

    if (isPlayingRef.current) {
      const engine = getAudioEngine();
      // Important: Check if engine is actually running to avoid getting 0
      // when we might have just stopped but the loop fired one last time.
      const t = engine.getCurrentTime();
      
      setCurrentTime(t);
      currentTimeRef.current = t;
      requestRef.current = requestAnimationFrame(updateTime);
    }
  }, [getAudioEngine]);

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateTime);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isPlaying, updateTime]); 

  // --- Handlers ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setProcessedUrl(null);
      setServerFiles({});
      setIsPlaying(false);
      isPlayingRef.current = false;
      setActivePreset(null);
      
      const engine = getAudioEngine();
      engine.stop();
      
      resetAll();

      const buffer = await f.arrayBuffer();
      const decoded = await engine.decodeAudioData(buffer);
      
      setAudioBuffer(decoded);
      setDuration(decoded.duration);
      setTrimStart(0);
      setTrimEnd(decoded.duration);
      setCurrentTime(0);
      currentTimeRef.current = 0;
    }
  };

  const handleClose = async () => {
      // 1. Stop playback
      const engine = getAudioEngine();
      engine.stop();
      setIsPlaying(false);
      isPlayingRef.current = false;

      // 2. Cleanup Server Files
      if (serverFiles.upload || serverFiles.processed) {
          const targets = [];
          if (serverFiles.upload) targets.push({ type: 'upload' as const, filename: serverFiles.upload });
          if (serverFiles.processed) targets.push({ type: 'processed' as const, filename: serverFiles.processed });
          
          cleanupFiles(targets).catch(err => console.error("Cleanup failed", err));
      }

      // 3. Reset all state
      setFile(null);
      setProcessedUrl(null);
      setServerFiles({});
      setAudioBuffer(null);
      resetAll();
  };

  const togglePlayback = async () => {
    const engine = getAudioEngine();
    
    if (!engine.getAudioBuffer() && audioBuffer) {
        engine.setAudioBuffer(audioBuffer);
    }

    if (isPlaying) {
      // PAUSE
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      // Update ref immediately to prevent loop from running if it was queued
      isPlayingRef.current = false;
      
      const pauseTime = engine.getCurrentTime();
      currentTimeRef.current = pauseTime;
      setCurrentTime(pauseTime);
      
      engine.stop();
      setIsPlaying(false);
    } else {
      // PLAY
      if (!audioBuffer) return;
      
      isPlayingRef.current = true;
      let startPos = currentTimeRef.current; 
      
      // Ensure start position is within current trim bounds
      if (startPos < trimStart || startPos >= trimEnd) {
          startPos = trimStart;
      }
      // If we are at the very end, restart
      if (startPos >= trimEnd - 0.1) {
          startPos = trimStart;
      }
      
      // Set current time before playing to ensure UI is synced
      setCurrentTime(startPos);
      currentTimeRef.current = startPos;

      await engine.playLoop(trimStart, trimEnd, startPos);
      setIsPlaying(true);
    }
  };

  const handleSeek = (t: number) => {
    setCurrentTime(t);
    currentTimeRef.current = t;
    
    // Check REF instead of state to avoid closure staleness issues
    if (isPlayingRef.current && !isScrubbingRef.current) {
        const engine = getAudioEngine();
        if (!engine.getAudioBuffer() && audioBuffer) engine.setAudioBuffer(audioBuffer);
        engine.playLoop(trimStart, trimEnd, t);
    }
  };

  const handleScrubStart = () => {
    isScrubbingRef.current = true;
    setIsScrubbing(true);
  };

  const handleScrubEnd = () => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    
    if (isPlayingRef.current) {
        const engine = getAudioEngine();
        if (!engine.getAudioBuffer() && audioBuffer) engine.setAudioBuffer(audioBuffer);
        // Use ref for most up-to-date time
        engine.playLoop(trimStart, trimEnd, currentTimeRef.current);
    }
  };

  const resetAll = () => {
      resetTimePitch();
      resetEQ();
      resetFX();
  };

  const resetTimePitch = () => {
      setVolume(1);
      setPitch(1);
      setSpeed(1);
      setFadeIn(0);
  };

  const resetEQ = () => {
      setEqBass(0);
      setEqMid(0);
      setEqTreble(0);
  };

  const resetFX = () => {
      setReverse(false);
      setSpatial8d(false);
      setReverb(false);
      setEnhanced(false);
  };

  const applyPreset = (type: string) => {
    if (activePreset === type) {
        resetAll();
        setActivePreset(null);
        return;
    }

    resetAll();
    setActivePreset(type);

    switch(type) {
        case 'nightcore':
            setSpeed(1.25);
            setPitch(1.25);
            break;
        case 'slowed':
            setSpeed(0.85);
            setPitch(0.95);
            setVolume(1.2);
            break;
        case 'bassboost':
            setEqBass(12);     
            setEqMid(-2);      
            setEqTreble(-5);   
            setVolume(0.9);   
            break;
        case 'helium':
            setPitch(1.5);
            break;
        case 'chipmunk':
            setPitch(1.6);
            break;
        case 'vaporwave':
            setSpeed(0.75);
            setPitch(0.75);
            setSpatial8d(true);
            setVolume(1.1);
            break;
        case 'telephone':
            setEqBass(-12);
            setEqTreble(-12);
            setEqMid(10);
            setVolume(1.2);
            break;
        case 'underwater':
            setEqBass(12);
            setEqMid(-5);
            setEqTreble(-12);
            setReverb(true);
            break;
    }
  };

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setProcessedUrl(null);
    getAudioEngine().stop();
    setIsPlaying(false);
    isPlayingRef.current = false;

    try {
      const config = {
        trim: { start: trimStart, end: trimEnd },
        volume,
        pitch,
        speed,
        fade: fadeIn > 0 ? { in: fadeIn } : undefined,
        eq: { bass: eqBass, mid: eqMid, treble: eqTreble },
        reverse,
        spatial8d,
        reverb,
        enhanced
      };

      const result = await processAudio(file, config);
      setProcessedUrl(getFullUrl(result.url));
      
      // Store filenames for cleanup
      setServerFiles({
          upload: result.uploadedFilename,
          processed: result.filename
      });
      
    } catch (err) {
      alert("Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdate = (setter: React.Dispatch<React.SetStateAction<any>>) => (val: any) => {
    setter(val);
    if (activePreset) setActivePreset(null); 
  };

  if (!file) {
    return (
      <EditorHeader 
        file={null} 
        duration={0} 
        onClose={() => {}} 
        onUpload={handleFileChange} 
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
        
        {/* Top Bar */}
        <EditorHeader 
          file={file} 
          duration={duration} 
          onClose={handleClose} 
          onUpload={handleFileChange} 
        />

        {/* Visualizer & Trimmer */}
        <WaveformEditor 
          audioBuffer={audioBuffer}
          currentTime={currentTime}
          duration={duration}
          trimStart={trimStart}
          trimEnd={trimEnd}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          onScrubStart={handleScrubStart}
          onScrubEnd={handleScrubEnd}
          onTrimStartChange={(v) => {
              const val = Math.max(0, Math.min(v, trimEnd - 0.1));
              setTrimStart(val);
          }}
          onTrimEndChange={(v) => {
              const val = Math.min(duration, Math.max(v, trimStart + 0.1));
              setTrimEnd(val);
          }}
          onTogglePlayback={togglePlayback}
        />

        {/* Presets Bar */}
        <PresetSelector 
          activePreset={activePreset} 
          onSelectPreset={applyPreset} 
        />

        {/* Effects Rack - Left Column */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <TimePitchControls 
              speed={speed} 
              pitch={pitch} 
              volume={volume} 
              fadeIn={fadeIn}
              onSpeedChange={handleUpdate(setSpeed)}
              onPitchChange={handleUpdate(setPitch)}
              onVolumeChange={handleUpdate(setVolume)}
              onFadeInChange={handleUpdate(setFadeIn)}
              onReset={resetTimePitch}
            />

            <EqualizerControls 
              bass={eqBass}
              mid={eqMid}
              treble={eqTreble}
              onBassChange={handleUpdate(setEqBass)}
              onMidChange={handleUpdate(setEqMid)}
              onTrebleChange={handleUpdate(setEqTreble)}
              onReset={resetEQ}
            />

            <EffectsRack 
              reverse={reverse}
              spatial8d={spatial8d}
              reverb={reverb}
              enhanced={enhanced}
              onReverseChange={() => handleUpdate(setReverse)(!reverse)}
              onSpatial8dChange={() => handleUpdate(setSpatial8d)(!spatial8d)}
              onReverbChange={() => handleUpdate(setReverb)(!reverb)}
              onEnhancedChange={() => handleUpdate(setEnhanced)(!enhanced)}
              onReset={resetFX}
            />

        </div>

        {/* Processing & Output - Right Column */}
        <OutputSection 
          isProcessing={isProcessing}
          processedUrl={processedUrl}
          onProcess={handleProcess}
          originalFilename={file.name}
        />

    </div>
  );
};

export default AudioEditor;
