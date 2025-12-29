const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const PROCESSED_DIR = path.join(__dirname, '../processed');

const getOutputPath = (ext = '.mp3') => {
  return path.join(PROCESSED_DIR, `output-${Date.now()}${ext}`);
};

/**
 * Extracts audio from a video file
 */
const extractAudio = (inputPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = getOutputPath('.mp3');
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioQuality(2)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

/**
 * Processes a single audio file with filters (Trim, EQ, Speed, Pitch, Vol, Fade, Reverse, 8D, Reverb)
 */
const processAudio = (inputPath, config) => {
  return new Promise((resolve, reject) => {
    const outputPath = getOutputPath('.mp3');
    let command = ffmpeg(inputPath);
    const audioFilters = [];

    // 1. Trimming (using atrim filter allows chaining)
    if (config.trim) {
      // atrim takes time in seconds
      audioFilters.push(`atrim=start=${config.trim.start}:end=${config.trim.end}`);
      // Reset timestamps after trim so other filters work from 0
      audioFilters.push('asetpts=PTS-STARTPTS');
    }

    // 2. Reverse (Must be early in chain if we want to trim the reversed part? No, usually trim then reverse)
    if (config.reverse) {
      audioFilters.push('areverse');
    }

    // 3. Equalizer (3-band)
    if (config.eq) {
      // Bass (Low shelf)
      if (config.eq.bass !== 0) {
        audioFilters.push(`lowshelf=g=${config.eq.bass}:f=100`);
      }
      // Mid (Peaking EQ)
      if (config.eq.mid !== 0) {
        audioFilters.push(`equalizer=f=1000:t=q:w=1:g=${config.eq.mid}`);
      }
      // Treble (High shelf)
      if (config.eq.treble !== 0) {
        audioFilters.push(`highshelf=g=${config.eq.treble}:f=10000`);
      }
    }

    // 4. Volume
    if (config.volume && config.volume !== 1) {
      audioFilters.push(`volume=${config.volume}`);
    }

    // 5. Fade In
    if (config.fade) {
      if (config.fade.in > 0) {
        audioFilters.push(`afade=t=in:ss=0:d=${config.fade.in}`);
      }
      // Fade out is tricky without duration, skipping for now to ensure stability
    }

    // 6. Pitch and Speed
    let speed = config.speed || 1.0;
    let pitch = config.pitch || 1.0;
    
    if (pitch !== 1.0 || speed !== 1.0) {
      audioFilters.push(`asetrate=44100*${pitch}`);
      
      const tempoFilter = (1 / pitch) * speed;
      
      let remainingTempo = tempoFilter;
      while (remainingTempo > 2.0) {
        audioFilters.push(`atempo=2.0`);
        remainingTempo /= 2.0;
      }
      while (remainingTempo < 0.5) {
        audioFilters.push(`atempo=0.5`);
        remainingTempo /= 0.5;
      }
      audioFilters.push(`atempo=${remainingTempo}`);
    }

    // 7. Special Effects
    
    // 8D Audio (Auto-pan)
    // apulsator: mode=sine, frequency=0.125Hz (8 seconds per cycle), amount=1 (full pan)
    if (config.spatial8d) {
       audioFilters.push('apulsator=mode=sine:hz=0.125:amount=1');
    }

    // Reverb / Echo
    // Simple echo: in_gain, out_gain, delays, decays
    if (config.reverb) {
       // A generic "Stadium" style echo/reverb
       audioFilters.push('aecho=0.8:0.9:1000:0.3');
    }

    if (audioFilters.length > 0) {
      command.complexFilter(audioFilters);
    }

    command
      .audioCodec('libmp3lame')
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

/**
 * Mixes or Joins multiple audio files
 */
const processMulti = (filePaths, operation) => {
  return new Promise((resolve, reject) => {
    const outputPath = getOutputPath('.mp3');
    let command = ffmpeg();

    filePaths.forEach(fp => command.input(fp));

    if (operation === 'join') {
      // Concatenate
      command.on('error', reject)
        .on('end', () => resolve(outputPath))
        .mergeToFile(outputPath, path.join(__dirname, '../uploads/temp/')); // fluent-ffmpeg handles concat magic
    } else {
      // Mix (Overlay)
      command.complexFilter([
        `amix=inputs=${filePaths.length}:duration=longest`
      ])
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath);
    }
  });
};

module.exports = {
  extractAudio,
  processAudio,
  processMulti
};