import React, { useState, useRef, useEffect, useCallback } from 'react';
import { processAudio, getFullUrl } from '../../services/apiService';
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
  // Ref to track current time without triggering re-renders, preventing stale closure issues in scrub handlers
  const currentTimeRef = useRef(0);
  
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

  // Spatial 8D Effect
  useEffect(() => {
     const engine = getAudioEngine();
     engine.setSpatial8d(spatial8d);
  }, [spatial8d, getAudioEngine]);

  // Enhancer Effect
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

  const updateTime = () => {
    if (isScrubbing) {
        requestRef.current = requestAnimationFrame(updateTime);
        return;
    }
    const engine = getAudioEngine();
    
    // Prevent updating time if we have stopped playing (but state update hasn't propagated or this frame was queued)
    if (isPlaying) {
      const t = engine.getCurrentTime();
      setCurrentTime(t);
      currentTimeRef.current = t;
      requestRef.current = requestAnimationFrame(updateTime);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateTime);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
  }, [isPlaying, isScrubbing]); 

  // --- Handlers ---

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setProcessedUrl(null);
      setIsPlaying(false);
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

  const togglePlayback = async () => {
    const engine = getAudioEngine();
    
    // Ensure engine has buffer if it was recreated (e.g. strict mode cleanup)
    if (!engine.getAudioBuffer() && audioBuffer) {
        engine.setAudioBuffer(audioBuffer);
    }

    if (isPlaying) {
      // PAUSE: Capture exact time before stopping to resume correctly later
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      
      const pauseTime = engine.getCurrentTime();
      currentTimeRef.current = pauseTime;
      setCurrentTime(pauseTime);
      
      engine.stop();
      setIsPlaying(false);
    } else {
      // PLAY
      if (!audioBuffer) return;
      
      let startPos = currentTimeRef.current; 
      // Ensure start position is within current trim bounds
      if (startPos < trimStart || startPos >= trimEnd) {
          startPos = trimStart;
      }
      
      await engine.playLoop(trimStart, trimEnd, startPos);
      setIsPlaying(true);
    }
  };

  const handleSeek = (t: number) => {
    setCurrentTime(t);
    currentTimeRef.current = t;
    
    // Only seek audio engine if we are NOT scrubbing (click to jump)
    if (isPlaying && !isScrubbing) {
        const engine = getAudioEngine();
        if (!engine.getAudioBuffer() && audioBuffer) engine.setAudioBuffer(audioBuffer);
        engine.playLoop(trimStart, trimEnd, t);
    }
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
  };

  const handleScrubEnd = () => {
    setIsScrubbing(false);
    // Resume playback at new position if it was playing.
    // We use currentTimeRef.current to get the latest position set by handleSeek during the drag.
    if (isPlaying) {
        const engine = getAudioEngine();
        if (!engine.getAudioBuffer() && audioBuffer) engine.setAudioBuffer(audioBuffer);
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
    // If clicking the active preset, toggle it off (reset)
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
            setPitch(0.85);
            setReverb(true);
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
    } catch (err) {
      alert("Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Handlers for component interaction ---
  const handleUpdate = (setter: React.Dispatch<React.SetStateAction<any>>) => (val: any) => {
    setter(val);
    if (activePreset) setActivePreset(null); // Deselect preset on manual adjustment
  };

  // If no file, Render just the Header (which handles upload UI)
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
          onClose={() => setFile(null)} 
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
              // Prevent Start from passing End
              const val = Math.max(0, Math.min(v, trimEnd - 0.1));
              setTrimStart(val);
          }}
          onTrimEndChange={(v) => {
              // Prevent End from passing Start
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
