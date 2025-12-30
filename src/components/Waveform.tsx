import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

interface WaveformProps {
  audioBuffer: AudioBuffer | null;
  loopStart: number;
  loopEnd: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

const Waveform: React.FC<WaveformProps> = ({ 
  audioBuffer, 
  loopStart, 
  loopEnd, 
  currentTime,
  onSeek,
  onScrubStart,
  onScrubEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Pre-calculate peaks to avoid O(N) loop on every render frame
  // This drastically improves performance during playback and slider interaction
  const peaks = useMemo(() => {
    if (!audioBuffer) return null;
    
    const width = 800; // Matches canvas width
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    // Store min/max interleaved
    const calculatedPeaks = new Float32Array(width * 2); 

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      const startIdx = i * step;
      const endIdx = Math.min(startIdx + step, data.length);

      // Optimization: For extremely large files, we could stride, but for typical songs this inner loop is okay once.
      for (let j = startIdx; j < endIdx; j++) {
        const datum = data[j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      calculatedPeaks[i * 2] = min;
      calculatedPeaks[i * 2 + 1] = max;
    }
    return calculatedPeaks;
  }, [audioBuffer]);

  // Drawing Logic
  useEffect(() => {
    if (!canvasRef.current || !peaks || !audioBuffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const amp = height / 2;
    const totalDuration = audioBuffer.duration;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, width, height);

    // Draw Loop Region
    const startX = (loopStart / totalDuration) * width;
    const endX = (loopEnd / totalDuration) * width;
    const loopWidth = Math.max(0, endX - startX);

    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'; // Indigo with opacity
    ctx.fillRect(startX, 0, loopWidth, height);
    
    // Draw Border for Loop Region
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, 0, loopWidth, height);

    // Draw Waveform from pre-calculated peaks
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; // Slate 400
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      ctx.moveTo(i, amp + min * amp);
      ctx.lineTo(i, amp + max * amp);
    }
    ctx.stroke();

    // Draw Playhead / Scrubber Line
    const playheadX = (currentTime / totalDuration) * width;
    
    ctx.beginPath();
    ctx.strokeStyle = '#ef4444'; // Red 500
    ctx.lineWidth = 2;
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
    
    // Playhead knob
    ctx.beginPath();
    ctx.fillStyle = '#ef4444';
    ctx.arc(playheadX, height - 5, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [peaks, audioBuffer, loopStart, loopEnd, currentTime]);

  // Interaction Logic using window listeners
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioBuffer) return;
    
    e.preventDefault();
    setIsDragging(true);
    onScrubStart?.();

    const updateTime = (clientX: number) => {
        if (!canvasRef.current || !audioBuffer) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        onSeek(percent * audioBuffer.duration);
    };

    updateTime(e.clientX);

    const handleMouseMove = (ev: MouseEvent) => {
      updateTime(ev.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onScrubEnd?.();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [audioBuffer, onSeek, onScrubStart, onScrubEnd]);

  return (
    <div className="w-full h-32 rounded-lg overflow-hidden border border-slate-700 shadow-inner relative group cursor-crosshair">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={128} 
        className="w-full h-full block"
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default Waveform;