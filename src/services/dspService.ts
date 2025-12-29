import { AnalysisResult, LoopCategory } from "../types";

// Helper to find the nearest zero crossing to avoid clicks
const findZeroCrossing = (data: Float32Array, index: number, searchRange: number): number => {
  const start = Math.max(0, index - searchRange);
  const end = Math.min(data.length - 1, index + searchRange);
  
  let minVal = 1.0;
  let minIdx = index;

  for (let i = start; i < end; i++) {
    if (data[i] > 0 && data[i+1] < 0) { // Crossing down
       const val = Math.abs(data[i]);
       if (val < minVal) {
         minVal = val;
         minIdx = i;
       }
    }
  }
  return minIdx;
};

// Calculate RMS (Energy) of a segment
const getRMS = (data: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
};

export const analyzeAudioDSP = async (audioBuffer: AudioBuffer): Promise<AnalysisResult> => {
  const channelData = audioBuffer.getChannelData(0); // Use left channel for analysis
  const sampleRate = audioBuffer.sampleRate;
  const duration = audioBuffer.duration;

  // 1. Basic BPM / Transient Detection
  // We will divide the song into 0.5s chunks to map energy
  const windowSize = 0.5; 
  const samplesPerWindow = Math.floor(sampleRate * windowSize);
  const energyProfile: { time: number; energy: number }[] = [];

  for (let i = 0; i < channelData.length; i += samplesPerWindow) {
    const end = Math.min(i + samplesPerWindow, channelData.length);
    const segment = channelData.slice(i, end);
    const energy = getRMS(segment);
    energyProfile.push({ time: i / sampleRate, energy });
  }

  // Sort windows by energy to find "Best" (loudest/busiest parts usually = chorus)
  const sortedEnergy = [...energyProfile].sort((a, b) => b.energy - a.energy);
  
  // Helper to create a loop object
  const createLoop = (centerTime: number, length: number, category: LoopCategory, desc: string) => {
    // Ensure loop is at least 5 seconds (per user request)
    const validLength = Math.max(5.0, length);
    
    let startRaw = Math.max(0, centerTime - (validLength / 2));
    let endRaw = Math.min(duration, startRaw + validLength);
    
    // Adjust length if we hit the end
    if (endRaw - startRaw < 5.0) {
        startRaw = Math.max(0, endRaw - 5.0);
    }

    // Snap to zero crossings for smooth audio
    const startSample = Math.floor(startRaw * sampleRate);
    const endSample = Math.floor(endRaw * sampleRate);
    const searchRange = 1000; // Search within ~20ms

    const safeStart = findZeroCrossing(channelData, startSample, searchRange) / sampleRate;
    const safeEnd = findZeroCrossing(channelData, endSample, searchRange) / sampleRate;

    return {
      id: `loop-${category}-${Date.now()}-${Math.random()}`,
      category,
      start: safeStart,
      end: safeEnd,
      description: desc
    };
  };

  const loops = [];

  // 0. ORIGINAL (Always available)
  loops.push({
    id: `loop-original-${Date.now()}`,
    category: LoopCategory.ORIGINAL,
    start: 0,
    end: duration,
    description: "Full original audio track"
  });

  // --- SPECIAL CASE: PERFECT IMPORT ---
  // If the file is short (< 30s), assume the user uploaded a pre-cut loop.
  // We prioritize this as the "BEST" loop.
  if (duration < 30.0) {
     loops.push({
        id: `loop-best-import-${Date.now()}`,
        category: LoopCategory.BEST,
        start: 0,
        end: duration,
        description: "Perfect Import (Full Audio)"
     });
  } else {
     // Standard Analysis for longer files
     const bestMoment = sortedEnergy[0];
     loops.push(createLoop(bestMoment.time, 8, LoopCategory.BEST, "High energy section"));
  }

  // --- STANDARD CATEGORIES ---
  
  // 2. SHORTEST LOOP: Minimum 5 seconds (or full duration if < 5)
  if (duration > 5) {
      const shortMoment = sortedEnergy[Math.floor(sortedEnergy.length * 0.2)]; 
      loops.push(createLoop(shortMoment.time, 5, LoopCategory.SHORTEST, "Short, punchy loop"));
  }

  // 3. LONGEST LOOP: 15 seconds
  if (duration > 15) {
      const longMoment = sortedEnergy[Math.floor(sortedEnergy.length * 0.1)]; 
      loops.push(createLoop(longMoment.time, 15, LoopCategory.LONGEST, "Extended section"));
  }

  // 4. EARLIEST LOOP
  if (duration > 10) {
      const earliestMoment = energyProfile.find(p => p.time > 5 && p.energy > 0.1) || energyProfile[10];
      loops.push(createLoop(earliestMoment ? earliestMoment.time : 5, 6, LoopCategory.EARLIEST, "Intro section"));
  }

  // 5. LATEST LOOP
  if (duration > 10) {
      const latestMoment = [...energyProfile].reverse().find(p => p.time < duration - 5 && p.energy > 0.1) || energyProfile[energyProfile.length - 10];
      loops.push(createLoop(latestMoment ? latestMoment.time : duration - 10, 6, LoopCategory.LATEST, "Outro section"));
  }

  // --- Generate Additional Candidates ---
  // We'll take top 15 energy points that are far enough from each other to be distinct
  const usedTimes = new Set<number>();
  // Add current ones to used times
  loops.forEach(l => usedTimes.add(Math.floor(l.start)));

  const candidates = [];
  
  if (duration > 10) { // Only generate candidates for longer files where variety makes sense
      for (const point of sortedEnergy) {
         if (candidates.length >= 20) break; // Limit total candidates

         const t = Math.floor(point.time);
         // Check if this time is close to an existing one (within 4 seconds)
         let isClose = false;
         for (const ut of usedTimes) {
             if (Math.abs(ut - t) < 4) {
                 isClose = true;
                 break;
             }
         }

         if (!isClose) {
             usedTimes.add(t);
             // Vary lengths slightly for variety
             const length = 5 + (Math.random() * 5); // 5 to 10 seconds
             candidates.push(createLoop(point.time, length, LoopCategory.CANDIDATE, `Energy peak at ${point.time.toFixed(0)}s`));
         }
      }
  }

  // Sort candidates by start time for the UI
  candidates.sort((a, b) => a.start - b.start);

  return { loops: [...loops, ...candidates] };
};