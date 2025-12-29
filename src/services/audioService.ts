import * as Tone from 'tone';

// Constant for smooth parameter transitions (in seconds)
const RAMP_TIME = 0.2;

export class AudioEngine {
  private audioContext: AudioContext;
  private audioBuffer: AudioBuffer | null = null;
  private reversedBuffer: AudioBuffer | null = null;
  
  // Player
  private grainPlayer: Tone.GrainPlayer | null = null;
  
  // Audio Graph Nodes (Native)
  private inputGainNode: GainNode;
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;
  private reverbConvolver: ConvolverNode;
  private reverbGain: GainNode;
  private masterGain: GainNode;

  // State
  private startTime: number = 0;
  private isLooping: boolean = false;
  private isReversed: boolean = false;
  private currentLoopStart: number = 0;
  private currentLoopEnd: number = 0;
  
  // Params Cache
  private _volume: number = 1;
  private _pitch: number = 1; // 1.0 = normal
  private _speed: number = 1;
  private _eq = { bass: 0, mid: 0, treble: 0 };
  private _reverbActive: boolean = false;

  constructor() {
    // We use Tone's context to ensure compatibility
    if (!Tone.getContext()) {
       // Accessing context initializes it
    }
    // Safe cast or access
    this.audioContext = (Tone.getContext().rawContext as AudioContext);
    
    // Initialize Native Nodes
    this.inputGainNode = this.audioContext.createGain();
    
    // EQ: LowShelf (Bass), Peaking (Mid), HighShelf (Treble)
    this.eqLow = this.audioContext.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 100;

    this.eqMid = this.audioContext.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1.0;

    this.eqHigh = this.audioContext.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 10000;

    // Reverb
    this.reverbConvolver = this.audioContext.createConvolver();
    this.reverbGain = this.audioContext.createGain();
    this.reverbGain.gain.value = 0;
    this.loadImpulseResponse();

    // Master
    this.masterGain = this.audioContext.createGain();

    // Connect Graph
    this.inputGainNode.connect(this.eqLow);
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.masterGain);
    
    // Reverb Send
    this.eqHigh.connect(this.reverbConvolver);
    this.reverbConvolver.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    this.masterGain.connect(this.audioContext.destination);
  }

  get state() {
    return this.audioContext.state;
  }

  isClosed(): boolean {
      return this.audioContext.state === 'closed';
  }

  setAudioBuffer(buffer: AudioBuffer) {
      this.audioBuffer = buffer;
      this.reversedBuffer = this.cloneAndReverseBuffer(buffer);
      // Update player buffer if active
      if (this.grainPlayer) {
          const bufferToUse = this.isReversed && this.reversedBuffer ? this.reversedBuffer : this.audioBuffer;
          this.grainPlayer.buffer = new Tone.ToneAudioBuffer(bufferToUse);
      }
  }

  private cloneAndReverseBuffer(buffer: AudioBuffer): AudioBuffer {
      const newBuffer = this.audioContext.createBuffer(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate
      );
      for (let i = 0; i < buffer.numberOfChannels; i++) {
          const channel = buffer.getChannelData(i);
          const newChannel = newBuffer.getChannelData(i);
          for (let j = 0; j < buffer.length; j++) {
              newChannel[j] = channel[buffer.length - 1 - j];
          }
      }
      return newBuffer;
  }

  private loadImpulseResponse() {
      const rate = this.audioContext.sampleRate;
      const length = rate * 2.0;
      const impulse = this.audioContext.createBuffer(2, length, rate);
      const left = impulse.getChannelData(0);
      const right = impulse.getChannelData(1);
      
      for (let i = 0; i < length; i++) {
          const decay = Math.pow(1 - i / length, 2);
          const noise = (Math.random() * 2 - 1) * decay;
          left[i] = noise;
          right[i] = noise;
      }
      this.reverbConvolver.buffer = impulse;
  }

  async decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // Clone buffer to prevent detachment issues
    const bufferCopy = arrayBuffer.slice(0);
    const decoded = await this.audioContext.decodeAudioData(bufferCopy);
    this.setAudioBuffer(decoded);
    return decoded;
  }

  getDuration(): number {
    return this.audioBuffer?.duration || 0;
  }

  getAudioBuffer(): AudioBuffer | null {
    return this.audioBuffer;
  }

  // --- Real-time Parameter Setters ---

  setVolume(v: number) {
      this._volume = v;
      // Use RAMP_TIME for smoother volume changes
      this.masterGain.gain.setTargetAtTime(v, this.audioContext.currentTime, RAMP_TIME);
  }

  setPitch(p: number) {
      this._pitch = p;
      this.updatePlayerParams();
  }

  setSpeed(s: number) {
      this._speed = s;
      this.updatePlayerParams();
  }

  setEQ(bass: number, mid: number, treble: number) {
      this._eq = { bass, mid, treble };
      // Use RAMP_TIME for smooth EQ sweeps
      this.eqLow.gain.setTargetAtTime(bass, this.audioContext.currentTime, RAMP_TIME);
      this.eqMid.gain.setTargetAtTime(mid, this.audioContext.currentTime, RAMP_TIME);
      this.eqHigh.gain.setTargetAtTime(treble, this.audioContext.currentTime, RAMP_TIME);
  }

  setReverb(active: boolean) {
      this._reverbActive = active;
      const targetGain = active ? 0.6 : 0;
      this.reverbGain.gain.setTargetAtTime(targetGain, this.audioContext.currentTime, RAMP_TIME);
  }

  setReverse(active: boolean) {
      if (this.isReversed !== active) {
          const currentTime = this.getCurrentTime();
          this.isReversed = active;
          if (this.grainPlayer && this.grainPlayer.state === 'started') {
              this.playLoop(this.currentLoopStart, this.currentLoopEnd, currentTime);
          }
      }
  }

  private updatePlayerParams() {
      if (this.grainPlayer) {
           // Defensive programming: Check if properties are Signals (objects with .rampTo) or primitives
           // This handles cases where Tone.js might behave differently in different builds/imports
           
           // PlaybackRate (Speed)
           const pRate = (this.grainPlayer.playbackRate as any);
           if (pRate && typeof pRate === 'object' && typeof pRate.rampTo === 'function') {
                // Use RAMP_TIME (0.2s) for smooth transitions
                pRate.rampTo(this._speed, RAMP_TIME);
           } else {
                (this.grainPlayer as any).playbackRate = this._speed;
           }
           
           // Detune (Pitch)
           const cents = 1200 * Math.log2(this._pitch);
           const detune = (this.grainPlayer.detune as any);
           if (detune && typeof detune === 'object' && typeof detune.rampTo === 'function') {
                detune.rampTo(cents, RAMP_TIME);
           } else {
                (this.grainPlayer as any).detune = cents;
           }
      }
  }

  // --- Playback ---

  getCurrentTime(): number {
    if (!this.grainPlayer) return 0;
    
    if (this.grainPlayer.state !== 'started') return this.currentLoopStart;

    const elapsed = this.audioContext.currentTime - (this.startTime || 0);
    const speed = this._speed || 1;
    const loopDuration = this.currentLoopEnd - this.currentLoopStart;
    
    if (loopDuration <= 0) return this.currentLoopStart;

    let relative = (elapsed * speed) % loopDuration;
    let pos = this.currentLoopStart + relative;

    if (this.isReversed) {
        pos = this.currentLoopEnd - relative;
    }

    return Math.max(0, Math.min(pos, this.getDuration()));
  }

  async playLoop(start: number, end: number, offset: number = 0) {
    this.stop(); 

    if (!this.audioBuffer) return;
    
    // Ensure Contexts are running
    if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
    }
    // Tone.start() is required to unlock AudioContext in some browsers
    if (Tone.context.state === 'suspended') {
        await Tone.start();
    }

    this.isLooping = true;
    this.currentLoopStart = start;
    this.currentLoopEnd = end;

    const bufferToUse = this.isReversed && this.reversedBuffer ? this.reversedBuffer : this.audioBuffer;
    
    // Explicitly wrap in ToneAudioBuffer for robustness
    const toneBuffer = new Tone.ToneAudioBuffer(bufferToUse);

    this.grainPlayer = new Tone.GrainPlayer(toneBuffer);
    this.grainPlayer.loop = true;
    
    // Fixed Granular Settings
    this.grainPlayer.grainSize = 0.2; 
    this.grainPlayer.overlap = 0.1;
    
    // Mapping Loop Start/End
    let loopStart = Math.max(0, Math.min(start, bufferToUse.duration));
    let loopEnd = Math.max(loopStart + 0.01, Math.min(end, bufferToUse.duration));
    
    if (this.isReversed) {
        const rStart = bufferToUse.duration - end;
        const rEnd = bufferToUse.duration - start;
        loopStart = Math.max(0, rStart);
        loopEnd = Math.min(bufferToUse.duration, rEnd);
    }
    
    this.grainPlayer.loopStart = loopStart;
    this.grainPlayer.loopEnd = loopEnd;
    
    // Connect to Native Audio Graph
    this.grainPlayer.connect(this.inputGainNode);
    
    // Set Initial Parameters
    // Check if params are Signals (have .value) or primitives
    
    // Speed
    const pRate = (this.grainPlayer.playbackRate as any);
    if (pRate && typeof pRate === 'object' && 'value' in pRate) {
        pRate.value = this._speed;
    } else {
        (this.grainPlayer as any).playbackRate = this._speed;
    }

    // Pitch
    const cents = 1200 * Math.log2(this._pitch);
    const detune = (this.grainPlayer.detune as any);
    if (detune && typeof detune === 'object' && 'value' in detune) {
        detune.value = cents;
    } else {
        (this.grainPlayer as any).detune = cents;
    }
    
    // Handle Offset
    let playOffset = offset;
    if (this.isReversed) {
        playOffset = bufferToUse.duration - offset;
    }
    
    // Clamp offset to loop bounds
    if (playOffset < loopStart || playOffset > loopEnd) {
        playOffset = loopStart;
    }

    // Record Start Time for UI Sync
    this.startTime = this.audioContext.currentTime - (playOffset - loopStart) / (this._speed || 1);
    
    // Start using Tone.now() to ensure immediate playback in Tone's timeline
    this.grainPlayer.start(Tone.now(), playOffset);
  }

  stop() {
    if (this.grainPlayer) {
      this.grainPlayer.stop();
      this.grainPlayer.dispose();
      this.grainPlayer = null;
    }
    this.isLooping = false;
  }

  close() {
    this.stop();
  }
  
  async generateRepeatedLoop(start: number, end: number, repetitions: number): Promise<AudioBuffer> {
    if (!this.audioBuffer) throw new Error("No audio loaded");
    const sampleRate = this.audioBuffer.sampleRate;
    const safeStart = Math.max(0, Math.min(start, this.audioBuffer.duration));
    const safeEnd = Math.max(safeStart + 0.01, Math.min(end, this.audioBuffer.duration));
    const loopDuration = safeEnd - safeStart;
    const loopSamples = Math.floor(loopDuration * sampleRate);
    const totalSamples = loopSamples * repetitions;
    const offlineCtx = new OfflineAudioContext(this.audioBuffer.numberOfChannels, totalSamples, sampleRate);
    const outputBuffer = offlineCtx.createBuffer(this.audioBuffer.numberOfChannels, totalSamples, sampleRate);
    for (let channel = 0; channel < this.audioBuffer.numberOfChannels; channel++) {
        const inputData = this.audioBuffer.getChannelData(channel);
        const outputData = outputBuffer.getChannelData(channel);
        const startSample = Math.floor(safeStart * sampleRate);
        for (let i = 0; i < repetitions; i++) {
            const offset = i * loopSamples;
            for (let j = 0; j < loopSamples; j++) {
                if (offset + j < outputData.length && startSample + j < inputData.length) {
                    outputData[offset + j] = inputData[startSample + j];
                }
            }
        }
    }
    return outputBuffer;
  }
}