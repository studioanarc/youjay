// Video Layer Types
export interface VideoLayer {
  id: string;
  name: string;
  videoId: string | null;
  youtubeUrl: string | null;
  localFile: File | null;
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  zIndex: number;
  effects: Effect[];
  volume: number;
  speed: number;
  loop: boolean;
  startTime: number;
  endTime: number | null;
  cuePoints: CuePoint[];
}

// Blend Modes
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'add'
  | 'subtract'
  | 'difference'
  | 'lighten'
  | 'darken'
  | 'color-dodge'
  | 'color-burn';

// Effect Types
export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
}

export type EffectType =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'hue'
  | 'pixelate'
  | 'kaleidoscope'
  | 'mirror'
  | 'edge-detect'
  | 'posterize'
  | 'glitch'
  | 'chromakey'
  | 'feedback'
  | 'rgb-shift'
  | 'vhs'
  | 'crt'
  | 'bloom'
  | 'custom';

// Transition Types
export interface Transition {
  type: TransitionType;
  duration: number;
  easing: EasingFunction;
  parameters: Record<string, number>;
}

export type TransitionType =
  | 'crossfade'
  | 'wipe-horizontal'
  | 'wipe-vertical'
  | 'wipe-diagonal'
  | 'wipe-circular'
  | 'zoom-in'
  | 'zoom-out'
  | 'rotate'
  | 'glitch'
  | 'pixelate'
  | 'none';

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'cubic-bezier';

// Cue Points
export interface CuePoint {
  id: string;
  time: number;
  label: string;
  color: string;
}

// Audio Reactivity
export interface AudioReactivity {
  enabled: boolean;
  sensitivity: number;
  smoothing: number;
  frequencyRange: [number, number];
  targetParameter: string;
  targetLayer: string | null;
  targetEffect: string | null;
}

// MIDI Mapping
export interface MIDIMapping {
  id: string;
  deviceId: string;
  channel: number;
  cc: number;
  targetType: 'layer' | 'effect' | 'transition' | 'global';
  targetId: string;
  targetParameter: string;
  min: number;
  max: number;
}

// Preset Types
export interface Preset {
  id: string;
  name: string;
  description: string;
  type: 'scene' | 'effect' | 'transition';
  data: any;
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
}

// Scene (complete app state snapshot)
export interface Scene {
  id: string;
  name: string;
  layers: VideoLayer[];
  globalEffects: Effect[];
  audioReactivity: AudioReactivity[];
  bpm: number;
  masterOpacity: number;
}

// Shader Types
export interface CustomShader {
  id: string;
  name: string;
  fragmentShader: string;
  vertexShader?: string;
  uniforms: Record<string, ShaderUniform>;
}

export interface ShaderUniform {
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
  value: any;
  min?: number;
  max?: number;
  label?: string;
}

// YouTube Player Types
export interface YouTubePlayer {
  id: string;
  playerId: string;
  videoId: string;
  player: any; // YouTube player instance
  status: 'loading' | 'ready' | 'playing' | 'paused' | 'buffering';
  hidden: boolean;
}

// Recording Types
export interface RecordingConfig {
  format: 'webm' | 'mp4';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  fps: 30 | 60;
  videoBitrate: number;
  audioBitrate: number;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  chunks: Blob[];
}

// App State
export interface AppState {
  layers: VideoLayer[];
  selectedLayerId: string | null;
  transition: Transition;
  bpm: number;
  isPlaying: boolean;
  masterOpacity: number;
  audioReactivity: AudioReactivity[];
  midiMappings: MIDIMapping[];
  presets: Preset[];
  customShaders: CustomShader[];
  recordingState: RecordingState;
  youtubePlayersPool: YouTubePlayer[];
}
