import { create } from 'zustand';
import type {
  VideoLayer,
  Transition,
  AudioReactivity,
  MIDIMapping,
  Preset,
  CustomShader,
  RecordingState,
  YouTubePlayer,
  Effect,
  BlendMode,
} from '../types';
import { initDB } from '../utils/db';
import { getAllPresets, savePreset as savePresetToDB, deletePreset as deletePresetFromDB } from '../utils/presetStorage';

interface VJStore {
  // Layers
  layers: VideoLayer[];
  selectedLayerId: string | null;
  addLayer: () => void;
  removeLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<VideoLayer>) => void;
  setSelectedLayer: (id: string | null) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;

  // Transition
  transition: Transition;
  setTransition: (transition: Transition) => void;

  // Global controls
  bpm: number;
  setBpm: (bpm: number) => void;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  masterOpacity: number;
  setMasterOpacity: (opacity: number) => void;

  // Audio reactivity
  audioReactivity: AudioReactivity[];
  addAudioReactivity: (reactivity: AudioReactivity) => void;
  removeAudioReactivity: (index: number) => void;
  updateAudioReactivity: (index: number, updates: Partial<AudioReactivity>) => void;

  // MIDI
  midiMappings: MIDIMapping[];
  midiLearnMode: boolean;
  midiLearnTarget: { type: MIDIMapping['targetType']; id: string; parameter: string } | null;
  addMidiMapping: (mapping: MIDIMapping) => void;
  removeMidiMapping: (id: string) => void;
  updateMidiMapping: (id: string, updates: Partial<MIDIMapping>) => void;
  setMidiLearnMode: (enabled: boolean, target?: { type: MIDIMapping['targetType']; id: string; parameter: string }) => void;

  // Presets
  presets: Preset[];
  addPreset: (preset: Preset) => void;
  removePreset: (id: string) => void;
  loadPreset: (id: string) => void;

  // Custom shaders
  customShaders: CustomShader[];
  addCustomShader: (shader: CustomShader) => void;
  removeCustomShader: (id: string) => void;
  updateCustomShader: (id: string, updates: Partial<CustomShader>) => void;

  // Recording
  recordingState: RecordingState;
  setRecordingState: (state: Partial<RecordingState>) => void;

  // YouTube players pool
  youtubePlayersPool: YouTubePlayer[];
  addYouTubePlayer: (player: YouTubePlayer) => void;
  removeYouTubePlayer: (id: string) => void;
  updateYouTubePlayer: (id: string, updates: Partial<YouTubePlayer>) => void;

  // Layer effects
  addEffect: (layerId: string, effect: Effect) => void;
  removeEffect: (layerId: string, effectId: string) => void;
  updateEffect: (layerId: string, effectId: string, updates: Partial<Effect>) => void;
  toggleEffect: (layerId: string, effectId: string) => void;

  // Database
  initializeDatabase: () => Promise<void>;
  isDbInitialized: boolean;

  // Utility
  reset: () => void;
}

const createDefaultLayer = (index: number): VideoLayer => ({
  id: `layer-${Date.now()}-${index}`,
  name: `Layer ${index + 1}`,
  videoId: null,
  youtubeUrl: null,
  localFile: null,
  opacity: 1,
  blendMode: 'normal' as BlendMode,
  visible: true,
  zIndex: index,
  effects: [],
  volume: 1,
  speed: 1,
  loop: true,
  startTime: 0,
  endTime: null,
  cuePoints: [],
});

export const useVJStore = create<VJStore>((set, get) => ({
  // Initial state
  layers: [createDefaultLayer(0), createDefaultLayer(1)],
  selectedLayerId: null,
  transition: {
    type: 'crossfade',
    duration: 1000,
    easing: 'ease-in-out',
    parameters: {},
  },
  bpm: 120,
  isPlaying: false,
  masterOpacity: 1,
  audioReactivity: [],
  midiMappings: [],
  midiLearnMode: false,
  midiLearnTarget: null,
  presets: [],
  customShaders: [],
  recordingState: {
    isRecording: false,
    isPaused: false,
    duration: 0,
    chunks: [],
  },
  youtubePlayersPool: [],
  isDbInitialized: false,

  // Layer actions
  addLayer: () => {
    const layers = get().layers;
    const newLayer = createDefaultLayer(layers.length);
    set({ layers: [...layers, newLayer] });
  },

  removeLayer: (id: string) => {
    set((state) => ({
      layers: state.layers.filter((layer) => layer.id !== id),
      selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId,
    }));
  },

  updateLayer: (id: string, updates: Partial<VideoLayer>) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer
      ),
    }));
  },

  setSelectedLayer: (id: string | null) => {
    set({ selectedLayerId: id });
  },

  reorderLayers: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const layers = [...state.layers];
      const [removed] = layers.splice(fromIndex, 1);
      layers.splice(toIndex, 0, removed);
      return {
        layers: layers.map((layer, index) => ({ ...layer, zIndex: index })),
      };
    });
  },

  // Transition actions
  setTransition: (transition: Transition) => {
    set({ transition });
  },

  // Global control actions
  setBpm: (bpm: number) => {
    set({ bpm });
  },

  setIsPlaying: (isPlaying: boolean) => {
    set({ isPlaying });
  },

  setMasterOpacity: (opacity: number) => {
    set({ masterOpacity: Math.max(0, Math.min(1, opacity)) });
  },

  // Audio reactivity actions
  addAudioReactivity: (reactivity: AudioReactivity) => {
    set((state) => ({
      audioReactivity: [...state.audioReactivity, reactivity],
    }));
  },

  removeAudioReactivity: (index: number) => {
    set((state) => ({
      audioReactivity: state.audioReactivity.filter((_, i) => i !== index),
    }));
  },

  updateAudioReactivity: (index: number, updates: Partial<AudioReactivity>) => {
    set((state) => ({
      audioReactivity: state.audioReactivity.map((reactivity, i) =>
        i === index ? { ...reactivity, ...updates } : reactivity
      ),
    }));
  },

  // MIDI actions
  addMidiMapping: (mapping: MIDIMapping) => {
    set((state) => ({
      midiMappings: [...state.midiMappings, mapping],
    }));
  },

  removeMidiMapping: (id: string) => {
    set((state) => ({
      midiMappings: state.midiMappings.filter((mapping) => mapping.id !== id),
    }));
  },

  updateMidiMapping: (id: string, updates: Partial<MIDIMapping>) => {
    set((state) => ({
      midiMappings: state.midiMappings.map((mapping) =>
        mapping.id === id ? { ...mapping, ...updates } : mapping
      ),
    }));
  },

  setMidiLearnMode: (enabled: boolean, target?: { type: MIDIMapping['targetType']; id: string; parameter: string }) => {
    set({
      midiLearnMode: enabled,
      midiLearnTarget: enabled && target ? target : null,
    });
  },

  // Preset actions
  addPreset: (preset: Preset) => {
    set((state) => ({
      presets: [...state.presets, preset],
    }));

    // Auto-save to database
    if (get().isDbInitialized) {
      savePresetToDB(preset).catch((error) => {
        console.error('Failed to save preset to database:', error);
      });
    }
  },

  removePreset: (id: string) => {
    set((state) => ({
      presets: state.presets.filter((preset) => preset.id !== id),
    }));

    // Auto-delete from database
    if (get().isDbInitialized) {
      deletePresetFromDB(id).catch((error) => {
        console.error('Failed to delete preset from database:', error);
      });
    }
  },

  loadPreset: (id: string) => {
    const preset = get().presets.find((p) => p.id === id);
    if (!preset) return;

    if (preset.type === 'scene') {
      set({ layers: preset.data.layers });
    } else if (preset.type === 'effect') {
      // Load effect preset logic
    }
  },

  // Custom shader actions
  addCustomShader: (shader: CustomShader) => {
    set((state) => ({
      customShaders: [...state.customShaders, shader],
    }));
  },

  removeCustomShader: (id: string) => {
    set((state) => ({
      customShaders: state.customShaders.filter((shader) => shader.id !== id),
    }));
  },

  updateCustomShader: (id: string, updates: Partial<CustomShader>) => {
    set((state) => ({
      customShaders: state.customShaders.map((shader) =>
        shader.id === id ? { ...shader, ...updates } : shader
      ),
    }));
  },

  // Recording actions
  setRecordingState: (updates: Partial<RecordingState>) => {
    set((state) => ({
      recordingState: { ...state.recordingState, ...updates },
    }));
  },

  // YouTube player pool actions
  addYouTubePlayer: (player: YouTubePlayer) => {
    set((state) => ({
      youtubePlayersPool: [...state.youtubePlayersPool, player],
    }));
  },

  removeYouTubePlayer: (id: string) => {
    set((state) => ({
      youtubePlayersPool: state.youtubePlayersPool.filter((p) => p.id !== id),
    }));
  },

  updateYouTubePlayer: (id: string, updates: Partial<YouTubePlayer>) => {
    set((state) => ({
      youtubePlayersPool: state.youtubePlayersPool.map((player) =>
        player.id === id ? { ...player, ...updates } : player
      ),
    }));
  },

  // Effect actions
  addEffect: (layerId: string, effect: Effect) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, effects: [...layer.effects, effect] }
          : layer
      ),
    }));
  },

  removeEffect: (layerId: string, effectId: string) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, effects: layer.effects.filter((e) => e.id !== effectId) }
          : layer
      ),
    }));
  },

  updateEffect: (layerId: string, effectId: string, updates: Partial<Effect>) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              effects: layer.effects.map((effect) =>
                effect.id === effectId ? { ...effect, ...updates } : effect
              ),
            }
          : layer
      ),
    }));
  },

  toggleEffect: (layerId: string, effectId: string) => {
    set((state) => ({
      layers: state.layers.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              effects: layer.effects.map((effect) =>
                effect.id === effectId
                  ? { ...effect, enabled: !effect.enabled }
                  : effect
              ),
            }
          : layer
      ),
    }));
  },

  // Database initialization
  initializeDatabase: async () => {
    try {
      await initDB();
      const presets = await getAllPresets();
      set({ presets, isDbInitialized: true });
      console.log('Database initialized and presets loaded');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      set({ isDbInitialized: false });
    }
  },

  // Utility
  reset: () => {
    set({
      layers: [createDefaultLayer(0), createDefaultLayer(1)],
      selectedLayerId: null,
      isPlaying: false,
      masterOpacity: 1,
    });
  },
}));
