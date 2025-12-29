import React, { useEffect, useRef, useState, useCallback } from 'react';

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

  // Drawing Logic
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const data = audioBuffer.getChannelData(0); // Use first channel
    const step = Math.ceil(data.length / width);
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
    const loopWidth = endX - startX;

    ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'; // Indigo with opacity
    ctx.fillRect(startX, 0, loopWidth, height);
    
    // Draw Border for Loop Region
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, 0, loopWidth, height);

    // Draw Waveform
    ctx.beginPath();
    ctx.strokeStyle = '#94a3b8'; // Slate 400
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
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
    
    // Playhead knob (optional visual flair)
    ctx.beginPath();
    ctx.fillStyle = '#ef4444';
    ctx.arc(playheadX, height - 5, 4, 0, Math.PI * 2);
    ctx.fill();

  }, [audioBuffer, loopStart, loopEnd, currentTime]);

  // Interaction Logic using window listeners
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !audioBuffer) return;
    
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    onScrubStart?.();

    const updateTime = (clientX: number) => {
        if (!canvasRef.current || !audioBuffer) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        onSeek(percent * audioBuffer.duration);
    };

    // Initial seek on click
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