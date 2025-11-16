/**
 * Utils barrel export
 */

export { VideoRecorder } from './VideoRecorder';
export { StreamCapture } from './StreamCapture';
export type { VideoRecorderCallbacks } from './VideoRecorder';
export type { StreamCaptureOptions } from './StreamCapture';

// Audio Reactivity
export { AudioAnalyzer } from './AudioAnalyzer';
export type { AudioData, AudioAnalyzerConfig } from './AudioAnalyzer';

export { BPMDetector } from './BPMDetector';
export type { BPMDetectorConfig, BPMData } from './BPMDetector';

export {
  AudioReactivityEngine,
  applyAudioReactivity,
  getBeatPulse,
  getBeatSawtooth,
  getBeatSine,
  getBeatSquare,
} from './audioReactivity';
export type { AudioSource, MappingMode, AudioMapping } from './audioReactivity';

// MIDI Support
export { MIDIController } from './MIDIController';
export type {
  MIDIDevice,
  MIDIMessage,
  MIDIMessageCallback,
  MIDIDeviceCallback,
} from './MIDIController';

export {
  MIDIMappingEngine,
  applyMIDIMapping,
  getParameterInfo,
} from './midiMapping';
export type { MIDILearnState } from './midiMapping';

// Keyboard Shortcuts
export {
  KeyboardShortcutsManager,
  keyboardShortcutsManager,
  formatShortcutKey,
  getShortcutCategories,
} from './keyboardShortcuts';
export type {
  KeyboardShortcut,
  ShortcutCategory,
  ShortcutConflict,
} from './keyboardShortcuts';

// Database
export {
  initDB,
  getDB,
  closeDB,
  clearAllData,
  clearStore,
  getStorageStats,
  isStorageQuotaExceeded,
  DatabaseError,
  DB_NAME,
  DB_VERSION,
} from './db';
export type {
  VJDatabaseSchema,
  SceneData,
  BackupData,
  StorageStats,
} from './db';

// Preset Storage
export {
  savePreset,
  getPreset,
  getAllPresets,
  getPresetsByType,
  getPresetsByDate,
  searchPresetsByName,
  searchPresetsByTags,
  updatePreset,
  deletePreset,
  deletePresets,
  deleteOldPresets,
  generatePresetThumbnail,
  duplicatePreset,
  getPresetCountByType,
  batchSavePresets,
  getRecentPresets,
  presetNameExists,
  getAllPresetTags,
} from './presetStorage';

// Scene Storage
export {
  saveScene,
  getScene,
  getAllScenes,
  getScenesByDate,
  searchScenesByName,
  searchScenesByTags,
  updateScene,
  deleteScene,
  deleteScenes,
  duplicateScene,
  loadScene,
  batchSaveScenes,
  getRecentScenes,
  sceneNameExists,
  getAllSceneTags,
  generateSceneThumbnail,
  updateSceneThumbnail,
  deleteOldScenes,
  getSceneCount,
} from './sceneStorage';

// Export/Import
export {
  exportPresets,
  exportScenes,
  exportShaders,
  exportMidiMappings,
  exportAll,
  downloadJSON,
  downloadPresets,
  downloadScenes,
  downloadAllData,
  importPresets,
  importScenes,
  importAll,
  importFromFile,
  createBackup,
  restoreFromBackup,
  getAllBackups,
  cleanupOldBackups,
  deleteBackup,
} from './exportImport';
export type { ExportData } from './exportImport';
