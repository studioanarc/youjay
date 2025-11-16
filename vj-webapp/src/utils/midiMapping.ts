/**
 * MIDI Mapping - Maps MIDI CC messages to application parameters
 * Supports MIDI learn mode and parameter value scaling
 */

import type { MIDIMessage } from './MIDIController';
import type { MIDIMapping } from '../types';

export interface MIDILearnState {
  active: boolean;
  targetType: MIDIMapping['targetType'];
  targetId: string;
  targetParameter: string;
  onLearn?: (mapping: Partial<MIDIMapping>) => void;
}

export class MIDIMappingEngine {
  private mappings: Map<string, MIDIMapping> = new Map();
  private learnState: MIDILearnState | null = null;
  private lastValues: Map<string, number> = new Map();

  /**
   * Add a MIDI mapping
   */
  addMapping(mapping: MIDIMapping): void {
    const key = this.getMappingKey(mapping.deviceId, mapping.channel, mapping.cc);
    this.mappings.set(key, mapping);
  }

  /**
   * Remove a MIDI mapping
   */
  removeMapping(id: string): void {
    for (const [key, mapping] of this.mappings.entries()) {
      if (mapping.id === id) {
        this.mappings.delete(key);
        break;
      }
    }
  }

  /**
   * Update a MIDI mapping
   */
  updateMapping(id: string, updates: Partial<MIDIMapping>): void {
    for (const [key, mapping] of this.mappings.entries()) {
      if (mapping.id === id) {
        const updated = { ...mapping, ...updates };
        this.mappings.set(key, updated);
        break;
      }
    }
  }

  /**
   * Get mapping by ID
   */
  getMappingById(id: string): MIDIMapping | undefined {
    for (const mapping of this.mappings.values()) {
      if (mapping.id === id) {
        return mapping;
      }
    }
    return undefined;
  }

  /**
   * Get all mappings
   */
  getAllMappings(): MIDIMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * Get mappings for a specific device
   */
  getMappingsForDevice(deviceId: string): MIDIMapping[] {
    return Array.from(this.mappings.values()).filter(
      mapping => mapping.deviceId === deviceId
    );
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.mappings.clear();
    this.lastValues.clear();
  }

  /**
   * Process MIDI message and apply to parameters
   */
  processMIDIMessage(message: MIDIMessage): MIDIMapping | null {
    // Handle MIDI learn mode
    if (this.learnState?.active && message.type === 'cc') {
      this.handleMIDILearn(message);
      return null;
    }

    // Only process CC messages for normal operation
    if (message.type !== 'cc' || message.cc === undefined) {
      return null;
    }

    // Find mapping for this message
    const key = this.getMappingKey(message.deviceId, message.channel, message.cc);
    const mapping = this.mappings.get(key);

    if (!mapping) {
      return null;
    }

    // Store last value
    this.lastValues.set(key, message.value);

    return mapping;
  }

  /**
   * Map MIDI value (0-127) to parameter value
   */
  mapValue(midiValue: number, mapping: MIDIMapping): number {
    // Normalize MIDI value to 0-1
    const normalized = midiValue / 127;

    // Map to parameter range
    const paramValue = mapping.min + normalized * (mapping.max - mapping.min);

    return paramValue;
  }

  /**
   * Start MIDI learn mode
   */
  startLearn(
    targetType: MIDIMapping['targetType'],
    targetId: string,
    targetParameter: string,
    onLearn?: (mapping: Partial<MIDIMapping>) => void
  ): void {
    this.learnState = {
      active: true,
      targetType,
      targetId,
      targetParameter,
      onLearn,
    };
  }

  /**
   * Stop MIDI learn mode
   */
  stopLearn(): void {
    this.learnState = null;
  }

  /**
   * Handle MIDI learn
   */
  private handleMIDILearn(message: MIDIMessage): void {
    if (!this.learnState || message.cc === undefined) return;

    const mapping: Partial<MIDIMapping> = {
      id: `midi-${Date.now()}`,
      deviceId: message.deviceId,
      channel: message.channel,
      cc: message.cc,
      targetType: this.learnState.targetType,
      targetId: this.learnState.targetId,
      targetParameter: this.learnState.targetParameter,
      min: 0,
      max: 1,
    };

    // Notify callback
    if (this.learnState.onLearn) {
      this.learnState.onLearn(mapping);
    }

    // Stop learn mode
    this.stopLearn();
  }

  /**
   * Check if in learn mode
   */
  isLearning(): boolean {
    return this.learnState?.active || false;
  }

  /**
   * Get current learn state
   */
  getLearnState(): MIDILearnState | null {
    return this.learnState;
  }

  /**
   * Generate mapping key
   */
  private getMappingKey(deviceId: string, channel: number, cc: number): string {
    return `${deviceId}_${channel}_${cc}`;
  }

  /**
   * Get last value for a mapping
   */
  getLastValue(deviceId: string, channel: number, cc: number): number | undefined {
    const key = this.getMappingKey(deviceId, channel, cc);
    return this.lastValues.get(key);
  }

  /**
   * Import mappings from JSON
   */
  importMappings(mappings: MIDIMapping[]): void {
    for (const mapping of mappings) {
      this.addMapping(mapping);
    }
  }

  /**
   * Export mappings to JSON
   */
  exportMappings(): MIDIMapping[] {
    return this.getAllMappings();
  }

  /**
   * Create a default mapping
   */
  static createDefaultMapping(
    deviceId: string,
    channel: number,
    cc: number,
    targetType: MIDIMapping['targetType'],
    targetId: string,
    targetParameter: string
  ): MIDIMapping {
    return {
      id: `midi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      deviceId,
      channel,
      cc,
      targetType,
      targetId,
      targetParameter,
      min: 0,
      max: 1,
    };
  }
}

/**
 * Apply MIDI value to layer/effect parameters
 */
export function applyMIDIMapping(
  mapping: MIDIMapping,
  value: number,
  layers: any[] // VideoLayer[]
): boolean {
  try {
    switch (mapping.targetType) {
      case 'layer':
        return applyToLayer(mapping, value, layers);

      case 'effect':
        return applyToEffect(mapping, value, layers);

      case 'global':
        return applyToGlobal(mapping, value);

      case 'transition':
        return applyToTransition(mapping, value);

      default:
        return false;
    }
  } catch (error) {
    console.error('Error applying MIDI mapping:', error);
    return false;
  }
}

/**
 * Apply MIDI value to layer parameter
 */
function applyToLayer(mapping: MIDIMapping, value: number, layers: any[]): boolean {
  const layer = layers.find(l => l.id === mapping.targetId);

  if (!layer) return false;

  if (mapping.targetParameter in layer) {
    (layer as any)[mapping.targetParameter] = value;
    return true;
  }

  return false;
}

/**
 * Apply MIDI value to effect parameter
 */
function applyToEffect(mapping: MIDIMapping, value: number, layers: any[]): boolean {
  // Find layer containing the effect
  for (const layer of layers) {
    const effect = layer.effects.find((e: any) => e.id === mapping.targetId);

    if (effect) {
      if (mapping.targetParameter in effect.parameters) {
        effect.parameters[mapping.targetParameter] = value;
        return true;
      }
    }
  }

  return false;
}

/**
 * Apply MIDI value to global parameter
 */
function applyToGlobal(mapping: MIDIMapping, _value: number): boolean {
  // Global parameters would be handled by the store
  // This function returns true if the parameter name is valid
  const validGlobalParams = ['masterOpacity', 'bpm'];
  return validGlobalParams.includes(mapping.targetParameter);
}

/**
 * Apply MIDI value to transition parameter
 */
function applyToTransition(mapping: MIDIMapping, _value: number): boolean {
  // Transition parameters would be handled by the store
  const validTransitionParams = ['duration'];
  return validTransitionParams.includes(mapping.targetParameter);
}

/**
 * Get parameter info for mapping UI
 */
export function getParameterInfo(
  targetType: MIDIMapping['targetType'],
  targetId: string,
  layers: any[]
): { name: string; min: number; max: number }[] {
  const params: { name: string; min: number; max: number }[] = [];

  switch (targetType) {
    case 'layer': {
      const layer = layers.find(l => l.id === targetId);
      if (layer) {
        params.push(
          { name: 'opacity', min: 0, max: 1 },
          { name: 'volume', min: 0, max: 1 },
          { name: 'speed', min: 0.1, max: 3 }
        );
      }
      break;
    }

    case 'effect': {
      // This would need to be dynamic based on effect type
      params.push(
        { name: 'amount', min: 0, max: 1 },
        { name: 'intensity', min: 0, max: 1 }
      );
      break;
    }

    case 'global': {
      params.push(
        { name: 'masterOpacity', min: 0, max: 1 },
        { name: 'bpm', min: 60, max: 180 }
      );
      break;
    }

    case 'transition': {
      params.push({ name: 'duration', min: 0, max: 5000 });
      break;
    }
  }

  return params;
}
