/**
 * Hooks barrel export
 */

export { useRecorder } from './useRecorder';
export type { UseRecorderOptions, UseRecorderResult } from './useRecorder';

// Audio & MIDI Hooks
export { useAudioReactivity } from './useAudioReactivity';
export type {
  UseAudioReactivityOptions,
  UseAudioReactivityReturn,
} from './useAudioReactivity';

export { useMIDI } from './useMIDI';
export type { UseMIDIOptions, UseMIDIReturn } from './useMIDI';

export { useBPM } from './useBPM';
export type { UseBPMOptions, UseBPMReturn } from './useBPM';

export { useKeyboardShortcuts } from './useKeyboardShortcuts';
