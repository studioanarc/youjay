/**
 * BPMDetector - Detects BPM (beats per minute) from audio using onset detection
 * Uses energy-based beat detection and autocorrelation for tempo estimation
 */

export interface BPMDetectorConfig {
  minBPM?: number;
  maxBPM?: number;
  sensitivity?: number;
  stabilityThreshold?: number;
}

export interface BPMData {
  bpm: number;
  confidence: number;
  beatDetected: boolean;
  lastBeatTime: number;
}

export class BPMDetector {
  private beatTimes: number[] = [];
  private lastBeatTime = 0;
  private currentBPM = 120;
  private energyHistory: number[] = [];
  private readonly historySize = 43; // ~1 second at 60fps
  private threshold = 1.3;
  private lastEnergy = 0;
  private beatConfidence = 0;

  private readonly minBPM: number;
  private readonly maxBPM: number;
  private readonly sensitivity: number;

  constructor(config: BPMDetectorConfig = {}) {
    this.minBPM = config.minBPM || 60;
    this.maxBPM = config.maxBPM || 180;
    this.sensitivity = config.sensitivity || 1.3;
    this.threshold = this.sensitivity;
  }

  /**
   * Process audio data and detect beats
   */
  processBeat(audioData: { bass: number; mid: number; amplitude: number }): BPMData {
    const now = performance.now();

    // Calculate instant energy from bass and amplitude
    const energy = (audioData.bass * 0.7 + audioData.amplitude * 0.3);

    // Add to energy history
    this.energyHistory.push(energy);
    if (this.energyHistory.length > this.historySize) {
      this.energyHistory.shift();
    }

    // Calculate average energy
    const avgEnergy = this.energyHistory.reduce((sum, e) => sum + e, 0) / this.energyHistory.length;

    // Detect beat: current energy is significantly higher than average
    let beatDetected = false;
    const timeSinceLastBeat = now - this.lastBeatTime;

    // Adaptive threshold
    const adaptiveThreshold = avgEnergy * this.threshold;

    // Beat detection with minimum time between beats (150ms = 400 BPM max)
    if (energy > adaptiveThreshold && timeSinceLastBeat > 150 && energy > this.lastEnergy) {
      beatDetected = true;
      this.lastBeatTime = now;
      this.beatTimes.push(now);

      // Keep only recent beats (last 8 seconds)
      const cutoffTime = now - 8000;
      this.beatTimes = this.beatTimes.filter(t => t > cutoffTime);

      // Calculate BPM from recent beats
      if (this.beatTimes.length >= 4) {
        const calculatedBPM = this.calculateBPM();
        if (calculatedBPM >= this.minBPM && calculatedBPM <= this.maxBPM) {
          // Smooth BPM changes
          this.currentBPM = this.currentBPM * 0.9 + calculatedBPM * 0.1;
          this.beatConfidence = Math.min(1, this.beatTimes.length / 16);
        }
      }
    }

    this.lastEnergy = energy;

    return {
      bpm: Math.round(this.currentBPM),
      confidence: this.beatConfidence,
      beatDetected,
      lastBeatTime: this.lastBeatTime,
    };
  }

  /**
   * Calculate BPM from beat intervals using median interval
   */
  private calculateBPM(): number {
    if (this.beatTimes.length < 2) return this.currentBPM;

    // Calculate intervals between beats
    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }

    // Use median interval to reduce outlier impact
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];

    // Convert interval (ms) to BPM
    const bpm = 60000 / medianInterval;

    return bpm;
  }

  /**
   * Calculate BPM using autocorrelation (more accurate but computationally expensive)
   * Currently unused but kept for future use
   */
  // @ts-expect-error - Unused method kept for future use
  private _calculateBPMAutocorrelation(): number {
    if (this.beatTimes.length < 4) return this.currentBPM;

    const intervals: number[] = [];
    for (let i = 1; i < this.beatTimes.length; i++) {
      intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
    }

    // Find the most common interval using autocorrelation
    const minInterval = 60000 / this.maxBPM; // ms per beat at max BPM
    const maxInterval = 60000 / this.minBPM; // ms per beat at min BPM

    let bestInterval = intervals[0];
    let bestScore = 0;

    // Test different intervals
    for (let testInterval = minInterval; testInterval <= maxInterval; testInterval += 10) {
      let score = 0;

      // Check how many intervals are close to this test interval or its multiples
      for (const interval of intervals) {
        const ratio = interval / testInterval;
        const nearestMultiple = Math.round(ratio);

        if (Math.abs(ratio - nearestMultiple) < 0.1) {
          score += 1 / nearestMultiple; // Prefer simpler ratios
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestInterval = testInterval;
      }
    }

    return 60000 / bestInterval;
  }

  /**
   * Manually set BPM (for manual tap tempo or external sync)
   */
  setBPM(bpm: number): void {
    if (bpm >= this.minBPM && bpm <= this.maxBPM) {
      this.currentBPM = bpm;
      this.beatConfidence = 1;
    }
  }

  /**
   * Tap tempo - call this method on each manual tap
   */
  tap(): void {
    const now = performance.now();
    this.lastBeatTime = now;
    this.beatTimes.push(now);

    // Keep only recent taps (last 4 seconds for tap tempo)
    const cutoffTime = now - 4000;
    this.beatTimes = this.beatTimes.filter(t => t > cutoffTime);

    if (this.beatTimes.length >= 2) {
      const bpm = this.calculateBPM();
      if (bpm >= this.minBPM && bpm <= this.maxBPM) {
        this.currentBPM = bpm;
        this.beatConfidence = Math.min(1, this.beatTimes.length / 8);
      }
    }
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.beatTimes = [];
    this.lastBeatTime = 0;
    this.energyHistory = [];
    this.lastEnergy = 0;
    this.beatConfidence = 0;
  }

  /**
   * Set sensitivity (higher = more beats detected)
   */
  setSensitivity(sensitivity: number): void {
    this.threshold = Math.max(1.0, Math.min(2.0, sensitivity));
  }

  /**
   * Get current BPM
   */
  getBPM(): number {
    return Math.round(this.currentBPM);
  }

  /**
   * Get beat phase (0-1 representing position in current beat)
   */
  getBeatPhase(): number {
    if (this.currentBPM === 0) return 0;

    const now = performance.now();
    const beatInterval = 60000 / this.currentBPM;
    const timeSinceLastBeat = now - this.lastBeatTime;

    return (timeSinceLastBeat % beatInterval) / beatInterval;
  }

  /**
   * Check if we're currently on a beat (within a small window)
   */
  isOnBeat(windowMs: number = 100): boolean {
    if (this.currentBPM === 0) return false;

    const now = performance.now();
    const beatInterval = 60000 / this.currentBPM;
    const timeSinceLastBeat = (now - this.lastBeatTime) % beatInterval;

    return timeSinceLastBeat < windowMs || timeSinceLastBeat > (beatInterval - windowMs);
  }

  /**
   * Get time until next beat (in milliseconds)
   */
  getTimeToNextBeat(): number {
    if (this.currentBPM === 0) return 0;

    const now = performance.now();
    const beatInterval = 60000 / this.currentBPM;
    const timeSinceLastBeat = now - this.lastBeatTime;

    return beatInterval - (timeSinceLastBeat % beatInterval);
  }
}
