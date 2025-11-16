/**
 * Audio Reactivity - Maps audio data to effect parameters
 * Supports different mapping modes and value transformations
 */

import type { AudioData } from './AudioAnalyzer';
import type { AudioReactivity } from '../types';

export type AudioSource = 'bass' | 'mid' | 'treble' | 'amplitude';
export type MappingMode = 'direct' | 'threshold' | 'range' | 'pulse';

export interface AudioMapping {
  source: AudioSource;
  mode: MappingMode;
  min: number;
  max: number;
  threshold?: number;
  invert?: boolean;
  curve?: number; // Exponential curve (1 = linear, >1 = exponential, <1 = logarithmic)
}

export class AudioReactivityEngine {
  private mappings: Map<string, AudioMapping> = new Map();
  private cachedValues: Map<string, number> = new Map();

  /**
   * Add an audio-to-parameter mapping
   */
  addMapping(parameterId: string, mapping: AudioMapping): void {
    this.mappings.set(parameterId, mapping);
  }

  /**
   * Remove a mapping
   */
  removeMapping(parameterId: string): void {
    this.mappings.delete(parameterId);
    this.cachedValues.delete(parameterId);
  }

  /**
   * Get all mappings
   */
  getMappings(): Map<string, AudioMapping> {
    return new Map(this.mappings);
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.mappings.clear();
    this.cachedValues.clear();
  }

  /**
   * Process audio data and update parameter values
   */
  process(audioData: AudioData): Map<string, number> {
    const values = new Map<string, number>();

    for (const [parameterId, mapping] of this.mappings.entries()) {
      const value = this.calculateValue(audioData, mapping);
      values.set(parameterId, value);
      this.cachedValues.set(parameterId, value);
    }

    return values;
  }

  /**
   * Calculate parameter value from audio data and mapping
   */
  private calculateValue(audioData: AudioData, mapping: AudioMapping): number {
    // Get source value (0-1)
    let sourceValue = this.getSourceValue(audioData, mapping.source);

    // Apply curve
    if (mapping.curve && mapping.curve !== 1) {
      sourceValue = Math.pow(sourceValue, mapping.curve);
    }

    // Apply mode-specific transformations
    switch (mapping.mode) {
      case 'direct':
        sourceValue = this.applyDirect(sourceValue);
        break;
      case 'threshold':
        sourceValue = this.applyThreshold(sourceValue, mapping.threshold || 0.5);
        break;
      case 'range':
        sourceValue = this.applyRange(sourceValue, mapping.min, mapping.max);
        break;
      case 'pulse':
        sourceValue = this.applyPulse(sourceValue, mapping.threshold || 0.5);
        break;
    }

    // Invert if needed
    if (mapping.invert) {
      sourceValue = 1 - sourceValue;
    }

    // Map to parameter range
    const paramValue = mapping.min + sourceValue * (mapping.max - mapping.min);

    return paramValue;
  }

  /**
   * Get audio source value
   */
  private getSourceValue(audioData: AudioData, source: AudioSource): number {
    switch (source) {
      case 'bass':
        return audioData.bass;
      case 'mid':
        return audioData.mid;
      case 'treble':
        return audioData.treble;
      case 'amplitude':
        return audioData.amplitude;
      default:
        return 0;
    }
  }

  /**
   * Direct mapping (passthrough)
   */
  private applyDirect(value: number): number {
    return value;
  }

  /**
   * Threshold mapping (0 below threshold, 1 above)
   */
  private applyThreshold(value: number, threshold: number): number {
    return value >= threshold ? 1 : 0;
  }

  /**
   * Range mapping (remap value to only use part of the range)
   */
  private applyRange(value: number, min: number, max: number): number {
    if (value < min) return 0;
    if (value > max) return 1;
    return (value - min) / (max - min);
  }

  /**
   * Pulse mapping (creates pulses when crossing threshold)
   */
  private applyPulse(value: number, threshold: number): number {
    const previousValue = this.cachedValues.get('__pulse_prev') || 0;
    this.cachedValues.set('__pulse_prev', value);

    // Trigger pulse on upward threshold crossing
    if (previousValue < threshold && value >= threshold) {
      return 1;
    }

    return 0;
  }

  /**
   * Get current value for a parameter
   */
  getValue(parameterId: string): number | undefined {
    return this.cachedValues.get(parameterId);
  }

  /**
   * Create mapping from AudioReactivity type
   */
  static createMappingFromReactivity(reactivity: AudioReactivity): AudioMapping {
    const [minFreq, maxFreq] = reactivity.frequencyRange;

    // Determine source based on frequency range
    let source: AudioSource = 'amplitude';
    if (maxFreq <= 250) {
      source = 'bass';
    } else if (minFreq >= 250 && maxFreq <= 4000) {
      source = 'mid';
    } else if (minFreq >= 4000) {
      source = 'treble';
    }

    return {
      source,
      mode: 'direct',
      min: 0,
      max: 1,
      curve: 1 / reactivity.sensitivity, // Inverse sensitivity as curve
    };
  }
}

/**
 * Apply audio reactivity to layer/effect parameters
 */
export function applyAudioReactivity(
  audioData: AudioData,
  reactivitySettings: AudioReactivity[],
  layers: any[], // VideoLayer[]
  effects: any[] // Effect[]
): void {
  const engine = new AudioReactivityEngine();

  // Create mappings from settings
  for (const setting of reactivitySettings) {
    if (!setting.enabled) continue;

    const mapping = AudioReactivityEngine.createMappingFromReactivity(setting);
    const parameterId = `${setting.targetLayer || 'global'}_${setting.targetEffect || 'layer'}_${setting.targetParameter}`;

    engine.addMapping(parameterId, mapping);
  }

  // Process audio data
  const values = engine.process(audioData);

  // Apply values to parameters
  for (const setting of reactivitySettings) {
    if (!setting.enabled) continue;

    const parameterId = `${setting.targetLayer || 'global'}_${setting.targetEffect || 'layer'}_${setting.targetParameter}`;
    const value = values.get(parameterId);

    if (value === undefined) continue;

    // Apply to layer parameter
    if (setting.targetLayer && !setting.targetEffect) {
      const layer = layers.find(l => l.id === setting.targetLayer);
      if (layer && setting.targetParameter in layer) {
        (layer as any)[setting.targetParameter] = value;
      }
    }

    // Apply to effect parameter
    if (setting.targetLayer && setting.targetEffect) {
      const layer = layers.find(l => l.id === setting.targetLayer);
      if (layer) {
        const effect = layer.effects.find((e: any) => e.id === setting.targetEffect);
        if (effect && setting.targetParameter in effect.parameters) {
          effect.parameters[setting.targetParameter] = value;
        }
      }
    }

    // Apply to global effect
    if (!setting.targetLayer && setting.targetEffect) {
      const effect = effects.find(e => e.id === setting.targetEffect);
      if (effect && setting.targetParameter in effect.parameters) {
        effect.parameters[setting.targetParameter] = value;
      }
    }
  }
}

/**
 * Create a beat-synced pulse value (0-1) based on BPM
 */
export function getBeatPulse(bpm: number, lastBeatTime: number, decay: number = 0.5): number {
  const beatInterval = 60000 / bpm; // ms per beat
  const timeSinceLastBeat = performance.now() - lastBeatTime;
  const beatPhase = (timeSinceLastBeat % beatInterval) / beatInterval;

  // Exponential decay from 1 to 0 over beat interval
  return Math.pow(1 - beatPhase, decay);
}

/**
 * Create a sawtooth wave synced to BPM
 */
export function getBeatSawtooth(bpm: number, lastBeatTime: number): number {
  const beatInterval = 60000 / bpm;
  const timeSinceLastBeat = performance.now() - lastBeatTime;
  const beatPhase = (timeSinceLastBeat % beatInterval) / beatInterval;

  return beatPhase;
}

/**
 * Create a sine wave synced to BPM
 */
export function getBeatSine(bpm: number, lastBeatTime: number, frequency: number = 1): number {
  const beatInterval = 60000 / bpm;
  const timeSinceLastBeat = performance.now() - lastBeatTime;
  const beatPhase = (timeSinceLastBeat % beatInterval) / beatInterval;

  return (Math.sin(beatPhase * Math.PI * 2 * frequency) + 1) / 2;
}

/**
 * Create a square wave synced to BPM
 */
export function getBeatSquare(bpm: number, lastBeatTime: number, dutyCycle: number = 0.5): number {
  const beatInterval = 60000 / bpm;
  const timeSinceLastBeat = performance.now() - lastBeatTime;
  const beatPhase = (timeSinceLastBeat % beatInterval) / beatInterval;

  return beatPhase < dutyCycle ? 1 : 0;
}
