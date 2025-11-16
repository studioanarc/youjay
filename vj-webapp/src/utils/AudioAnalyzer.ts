/**
 * AudioAnalyzer - Web Audio API based audio analysis
 * Provides frequency band analysis (bass, mid, treble) and amplitude detection
 */

export interface AudioData {
  bass: number;
  mid: number;
  treble: number;
  amplitude: number;
  frequencyData: Uint8Array<ArrayBuffer>;
  timeDomainData: Uint8Array<ArrayBuffer>;
  timestamp: number;
}

export interface AudioAnalyzerConfig {
  fftSize?: number;
  smoothingTimeConstant?: number;
  minDecibels?: number;
  maxDecibels?: number;
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private timeDomainArray: Uint8Array | null = null;
  private isInitialized = false;
  private config: AudioAnalyzerConfig;

  // Smoothing values for jitter prevention
  private smoothedBass = 0;
  private smoothedMid = 0;
  private smoothedTreble = 0;
  private smoothedAmplitude = 0;
  private smoothingFactor = 0.8; // Higher = more smoothing

  constructor(config: AudioAnalyzerConfig = {}) {
    this.config = {
      fftSize: 2048,
      smoothingTimeConstant: 0.8,
      minDecibels: -90,
      maxDecibels: -10,
      ...config,
    };
  }

  /**
   * Initialize audio analysis for a media element
   */
  async initialize(audioElement: HTMLAudioElement | HTMLVideoElement): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize!;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant!;
      this.analyser.minDecibels = this.config.minDecibels!;
      this.analyser.maxDecibels = this.config.maxDecibels!;

      // Create source from media element
      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);

      // Connect: source -> analyser -> destination
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      // Initialize data arrays
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.timeDomainArray = new Uint8Array(bufferLength);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioAnalyzer:', error);
      throw error;
    }
  }

  /**
   * Initialize from a MediaStream (e.g., microphone)
   */
  async initializeFromStream(stream: MediaStream): Promise<void> {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize!;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant!;
      this.analyser.minDecibels = this.config.minDecibels!;
      this.analyser.maxDecibels = this.config.maxDecibels!;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.timeDomainArray = new Uint8Array(bufferLength);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioAnalyzer from stream:', error);
      throw error;
    }
  }

  /**
   * Get current audio data with frequency bands and amplitude
   */
  getAudioData(): AudioData | null {
    if (!this.isInitialized || !this.analyser || !this.dataArray || !this.timeDomainArray) {
      return null;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

    // Get time domain data
    this.analyser.getByteTimeDomainData(this.timeDomainArray as Uint8Array<ArrayBuffer>);

    // Calculate frequency bands
    const bass = this.getFrequencyBand(0, 0.1); // 0-10% of spectrum (low frequencies)
    const mid = this.getFrequencyBand(0.1, 0.5); // 10-50% of spectrum (mid frequencies)
    const treble = this.getFrequencyBand(0.5, 1.0); // 50-100% of spectrum (high frequencies)

    // Calculate overall amplitude
    const amplitude = this.getAmplitude();

    // Apply smoothing to prevent jitter
    this.smoothedBass = this.smooth(this.smoothedBass, bass);
    this.smoothedMid = this.smooth(this.smoothedMid, mid);
    this.smoothedTreble = this.smooth(this.smoothedTreble, treble);
    this.smoothedAmplitude = this.smooth(this.smoothedAmplitude, amplitude);

    return {
      bass: this.smoothedBass,
      mid: this.smoothedMid,
      treble: this.smoothedTreble,
      amplitude: this.smoothedAmplitude,
      frequencyData: this.dataArray as Uint8Array<ArrayBuffer>,
      timeDomainData: this.timeDomainArray as Uint8Array<ArrayBuffer>,
      timestamp: Date.now(),
    };
  }

  /**
   * Get frequency data for a specific range
   */
  getFrequencyRange(minFreq: number, maxFreq: number): number {
    if (!this.isInitialized || !this.analyser || !this.dataArray) {
      return 0;
    }

    this.analyser.getByteFrequencyData(this.dataArray as Uint8Array<ArrayBuffer>);

    const nyquist = this.audioContext!.sampleRate / 2;
    const binCount = this.analyser.frequencyBinCount;

    const minBin = Math.floor((minFreq / nyquist) * binCount);
    const maxBin = Math.floor((maxFreq / nyquist) * binCount);

    let sum = 0;
    let count = 0;

    for (let i = minBin; i <= maxBin && i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
      count++;
    }

    return count > 0 ? (sum / count) / 255 : 0;
  }

  /**
   * Calculate frequency band value (normalized 0-1)
   */
  private getFrequencyBand(startRatio: number, endRatio: number): number {
    if (!this.dataArray) return 0;

    const startIndex = Math.floor(startRatio * this.dataArray.length);
    const endIndex = Math.floor(endRatio * this.dataArray.length);

    let sum = 0;
    let count = 0;

    for (let i = startIndex; i < endIndex && i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
      count++;
    }

    // Normalize to 0-1 range
    return count > 0 ? (sum / count) / 255 : 0;
  }

  /**
   * Calculate overall amplitude (normalized 0-1)
   */
  private getAmplitude(): number {
    if (!this.timeDomainArray) return 0;

    let sum = 0;
    for (let i = 0; i < this.timeDomainArray.length; i++) {
      const normalized = (this.timeDomainArray[i] - 128) / 128;
      sum += Math.abs(normalized);
    }

    return sum / this.timeDomainArray.length;
  }

  /**
   * Smooth values to prevent jitter
   */
  private smooth(oldValue: number, newValue: number): number {
    return oldValue * this.smoothingFactor + newValue * (1 - this.smoothingFactor);
  }

  /**
   * Set smoothing factor (0-1, higher = more smoothing)
   */
  setSmoothingFactor(factor: number): void {
    this.smoothingFactor = Math.max(0, Math.min(1, factor));
  }

  /**
   * Resume audio context (needed after user interaction in some browsers)
   */
  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.dataArray = null;
    this.timeDomainArray = null;
    this.isInitialized = false;
  }

  /**
   * Check if analyzer is ready
   */
  get ready(): boolean {
    return this.isInitialized;
  }

  /**
   * Get audio context state
   */
  get state(): AudioContextState | null {
    return this.audioContext?.state || null;
  }
}
