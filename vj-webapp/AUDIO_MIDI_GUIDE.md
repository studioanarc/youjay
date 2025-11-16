# Audio Reactivity & MIDI Controller Support Guide

This guide covers the implementation and usage of audio reactivity and MIDI controller support in the VJ webapp.

## Table of Contents

1. [Audio Reactivity](#audio-reactivity)
2. [BPM Detection](#bpm-detection)
3. [MIDI Controller Support](#midi-controller-support)
4. [React Hooks](#react-hooks)
5. [Usage Examples](#usage-examples)
6. [API Reference](#api-reference)

---

## Audio Reactivity

### Overview

The audio reactivity system uses the Web Audio API to analyze audio in real-time, providing frequency band analysis (bass, mid, treble) and amplitude detection at 60fps.

### Core Components

#### AudioAnalyzer (`src/utils/AudioAnalyzer.ts`)

Analyzes audio from video elements or media streams.

**Features:**
- FFT-based frequency analysis
- Frequency band separation (bass, mid, treble)
- Amplitude detection
- Smoothing to prevent jitter
- Custom frequency range analysis

**Basic Usage:**

```typescript
import { AudioAnalyzer } from './utils/AudioAnalyzer';

const analyzer = new AudioAnalyzer({
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
});

// Initialize with video element
await analyzer.initialize(videoElement);

// Get audio data
const audioData = analyzer.getAudioData();
console.log(audioData.bass, audioData.mid, audioData.treble, audioData.amplitude);

// Get specific frequency range
const lowBass = analyzer.getFrequencyRange(20, 100); // 20-100 Hz
```

#### AudioReactivityEngine (`src/utils/audioReactivity.ts`)

Maps audio data to effect parameters with various mapping modes.

**Mapping Modes:**
- **direct**: Linear mapping from audio to parameter
- **threshold**: Binary output based on threshold
- **range**: Remap audio value to custom range
- **pulse**: Trigger on threshold crossing

**Basic Usage:**

```typescript
import { AudioReactivityEngine } from './utils/audioReactivity';

const engine = new AudioReactivityEngine();

// Add mapping: bass frequency controls layer opacity
engine.addMapping('layer1_opacity', {
  source: 'bass',
  mode: 'direct',
  min: 0,
  max: 1,
  curve: 1.5, // Exponential curve
  invert: false,
});

// Process audio data
const values = engine.process(audioData);
const opacity = values.get('layer1_opacity');
```

### Beat-Synced Helpers

```typescript
import { getBeatPulse, getBeatSawtooth, getBeatSine } from './utils/audioReactivity';

// Create pulse that decays from 1 to 0 over each beat
const pulse = getBeatPulse(bpm, lastBeatTime, 0.5);

// Create sawtooth wave (0-1) synced to BPM
const sawtooth = getBeatSawtooth(bpm, lastBeatTime);

// Create sine wave synced to BPM
const sine = getBeatSine(bpm, lastBeatTime, 2); // 2x frequency
```

---

## BPM Detection

### Overview

The BPM detector uses onset detection and autocorrelation to automatically detect the tempo of playing audio.

### BPMDetector (`src/utils/BPMDetector.ts`)

**Features:**
- Energy-based beat detection
- Autocorrelation for tempo estimation
- Tap tempo support
- Beat phase tracking
- Configurable BPM range (default: 60-180)

**Basic Usage:**

```typescript
import { BPMDetector } from './utils/BPMDetector';

const detector = new BPMDetector({
  minBPM: 60,
  maxBPM: 180,
  sensitivity: 1.3,
});

// Process audio data each frame
const bpmData = detector.processBeat({
  bass: audioData.bass,
  mid: audioData.mid,
  amplitude: audioData.amplitude,
});

console.log('BPM:', bpmData.bpm);
console.log('Confidence:', bpmData.confidence);
console.log('Beat detected:', bpmData.beatDetected);

// Manual BPM setting
detector.setBPM(128);

// Tap tempo
detector.tap(); // Call on each user tap

// Get beat phase (0-1)
const phase = detector.getBeatPhase();

// Check if on beat
const onBeat = detector.isOnBeat(100); // Within 100ms window
```

---

## MIDI Controller Support

### Overview

The MIDI system provides Web MIDI API integration for connecting hardware MIDI controllers, with support for multiple devices, MIDI learn mode, and parameter mapping.

### MIDIController (`src/utils/MIDIController.ts`)

**Features:**
- Web MIDI API integration
- Multiple device support
- Input and output
- Message parsing (Note On/Off, CC, Program Change, Pitch Bend)
- Event callbacks

**Basic Usage:**

```typescript
import { MIDIController } from './utils/MIDIController';

const controller = new MIDIController();
await controller.initialize();

// Listen for MIDI messages
controller.onMessage((message) => {
  console.log('MIDI message:', message.type, message.cc, message.value);
});

// Listen for device connections
controller.onDeviceConnected((device) => {
  console.log('Device connected:', device.name);
});

// Get connected devices
const devices = controller.getInputDevices();

// Send MIDI message
controller.sendCC(deviceId, 1, 7, 127); // Channel 1, CC 7, value 127
```

### MIDIMappingEngine (`src/utils/midiMapping.ts`)

Maps MIDI CC messages to application parameters with support for MIDI learn mode.

**Features:**
- MIDI CC to parameter mapping
- Value scaling (0-127 → parameter range)
- MIDI learn mode
- Import/export mappings
- Per-device mapping management

**Basic Usage:**

```typescript
import { MIDIMappingEngine, MIDIMappingEngine as MME } from './utils/midiMapping';

const engine = new MIDIMappingEngine();

// Add mapping manually
const mapping = MME.createDefaultMapping(
  deviceId,
  1, // channel
  7, // CC number
  'layer', // target type
  'layer-1', // target ID
  'opacity' // parameter name
);
engine.addMapping(mapping);

// MIDI learn mode
engine.startLearn('layer', 'layer-1', 'opacity', (mapping) => {
  console.log('Learned mapping:', mapping);
});

// Process MIDI message
const mapping = engine.processMIDIMessage(midiMessage);
if (mapping) {
  const value = engine.mapValue(midiMessage.value, mapping);
  // Apply value to parameter
}
```

---

## React Hooks

### useAudioReactivity

React hook for real-time audio analysis.

```typescript
import { useAudioReactivity } from './hooks/useAudioReactivity';

function MyComponent() {
  const {
    audioData,
    isInitialized,
    error,
    initialize,
    initializeFromStream,
    dispose,
    resume,
    setSmoothingFactor,
    getFrequencyRange,
  } = useAudioReactivity({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    smoothingFactor: 0.8,
    enabled: true,
    targetFPS: 60,
  });

  useEffect(() => {
    if (videoRef.current) {
      initialize(videoRef.current);
    }
  }, [initialize]);

  return <div>Bass: {audioData?.bass}</div>;
}
```

### useMIDI

React hook for MIDI controller connections.

```typescript
import { useMIDI } from './hooks/useMIDI';

function MyComponent() {
  const {
    isInitialized,
    isSupported,
    error,
    devices,
    inputDevices,
    outputDevices,
    mappingEngine,
    initialize,
    dispose,
    sendCC,
    startLearn,
    stopLearn,
    isLearning,
  } = useMIDI({
    autoConnect: true,
    onMessage: (message) => {
      console.log('MIDI:', message);
    },
    onDeviceConnected: (device) => {
      console.log('Connected:', device.name);
    },
  });

  return (
    <div>
      <p>Devices: {inputDevices.length}</p>
      <button onClick={() => startLearn('layer', layerId, 'opacity')}>
        MIDI Learn
      </button>
    </div>
  );
}
```

### useBPM

React hook for BPM detection and synchronization.

```typescript
import { useBPM } from './hooks/useBPM';
import { useAudioReactivity } from './hooks/useAudioReactivity';

function MyComponent() {
  const { audioData } = useAudioReactivity({ enabled: true });

  const {
    bpm,
    confidence,
    beatDetected,
    beatPhase,
    isOnBeat,
    timeToNextBeat,
    tap,
    setBPM,
    reset,
    setSensitivity,
  } = useBPM(audioData, {
    minBPM: 60,
    maxBPM: 180,
    sensitivity: 1.3,
    enabled: true,
    onBeatDetected: (bpm) => console.log('Beat!', bpm),
    onBPMChange: (bpm) => console.log('BPM changed:', bpm),
  });

  return (
    <div>
      <p>BPM: {bpm} (Confidence: {(confidence * 100).toFixed(0)}%)</p>
      <p>Beat Phase: {(beatPhase * 100).toFixed(0)}%</p>
      <p>On Beat: {isOnBeat ? 'Yes' : 'No'}</p>
      <button onClick={tap}>Tap Tempo</button>
    </div>
  );
}
```

---

## Usage Examples

### Example 1: Audio-Reactive Layer Opacity

```typescript
import { useAudioReactivity } from './hooks/useAudioReactivity';
import { useVJStore } from './store';

function AudioReactiveLayer({ layerId }) {
  const { audioData } = useAudioReactivity({ enabled: true });
  const updateLayer = useVJStore((state) => state.updateLayer);

  useEffect(() => {
    if (audioData) {
      // Make layer opacity reactive to bass
      updateLayer(layerId, {
        opacity: 0.5 + audioData.bass * 0.5,
      });
    }
  }, [audioData, layerId, updateLayer]);

  return null; // This is a controller component
}
```

### Example 2: MIDI-Controlled Effect Parameter

```typescript
import { useMIDI } from './hooks/useMIDI';
import { useVJStore } from './store';
import { applyMIDIMapping } from './utils/midiMapping';

function MIDIController() {
  const layers = useVJStore((state) => state.layers);
  const midiMappings = useVJStore((state) => state.midiMappings);

  const { mappingEngine } = useMIDI({
    autoConnect: true,
    onMessage: (message) => {
      const mapping = mappingEngine.processMIDIMessage(message);
      if (mapping && message.type === 'cc') {
        const value = mappingEngine.mapValue(message.value, mapping);
        applyMIDIMapping(mapping, value, layers, []);
      }
    },
  });

  return null;
}
```

### Example 3: MIDI Learn Button

```typescript
import { useVJStore } from './store';

function MIDILearnButton({ layerId, parameter }) {
  const setMidiLearnMode = useVJStore((state) => state.setMidiLearnMode);
  const midiLearnMode = useVJStore((state) => state.midiLearnMode);
  const midiLearnTarget = useVJStore((state) => state.midiLearnTarget);

  const isLearning =
    midiLearnMode &&
    midiLearnTarget?.type === 'layer' &&
    midiLearnTarget?.id === layerId &&
    midiLearnTarget?.parameter === parameter;

  return (
    <button
      onClick={() => {
        if (isLearning) {
          setMidiLearnMode(false);
        } else {
          setMidiLearnMode(true, { type: 'layer', id: layerId, parameter });
        }
      }}
    >
      {isLearning ? 'Learning...' : 'MIDI Learn'}
    </button>
  );
}
```

### Example 4: Beat-Synced Visual Effect

```typescript
import { useBPM } from './hooks/useBPM';
import { useAudioReactivity } from './hooks/useAudioReactivity';
import { getBeatPulse } from './utils/audioReactivity';

function BeatSyncedEffect() {
  const { audioData } = useAudioReactivity({ enabled: true });
  const { bpm, beatDetected, beatPhase } = useBPM(audioData);

  const pulse = getBeatPulse(bpm, performance.now() - beatPhase * (60000 / bpm));
  const scale = 1 + pulse * 0.5;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transition: 'transform 0.05s ease-out',
        backgroundColor: beatDetected ? 'red' : 'blue',
      }}
    >
      Beat Synced!
    </div>
  );
}
```

---

## API Reference

### AudioAnalyzer

**Constructor Options:**
```typescript
{
  fftSize?: number;              // Default: 2048
  smoothingTimeConstant?: number; // Default: 0.8
  minDecibels?: number;          // Default: -90
  maxDecibels?: number;          // Default: -10
}
```

**Methods:**
- `initialize(element: HTMLMediaElement): Promise<void>`
- `initializeFromStream(stream: MediaStream): Promise<void>`
- `getAudioData(): AudioData | null`
- `getFrequencyRange(minFreq: number, maxFreq: number): number`
- `setSmoothingFactor(factor: number): void`
- `resume(): Promise<void>`
- `dispose(): void`

**AudioData:**
```typescript
{
  bass: number;           // 0-1
  mid: number;            // 0-1
  treble: number;         // 0-1
  amplitude: number;      // 0-1
  frequencyData: Uint8Array;
  timeDomainData: Uint8Array;
  timestamp: number;
}
```

### BPMDetector

**Constructor Options:**
```typescript
{
  minBPM?: number;            // Default: 60
  maxBPM?: number;            // Default: 180
  sensitivity?: number;       // Default: 1.3
  stabilityThreshold?: number; // Default: 0.8
}
```

**Methods:**
- `processBeat(audioData): BPMData`
- `setBPM(bpm: number): void`
- `tap(): void`
- `getBPM(): number`
- `getBeatPhase(): number`
- `isOnBeat(windowMs?: number): boolean`
- `getTimeToNextBeat(): number`
- `reset(): void`
- `setSensitivity(sensitivity: number): void`

### MIDIController

**Methods:**
- `initialize(): Promise<void>`
- `onMessage(callback): () => void`
- `onDeviceConnected(callback): () => void`
- `onDeviceDisconnected(callback): () => void`
- `getInputDevices(): MIDIDevice[]`
- `getOutputDevices(): MIDIDevice[]`
- `getAllDevices(): MIDIDevice[]`
- `sendMessage(deviceId, data): void`
- `sendNoteOn(deviceId, channel, note, velocity): void`
- `sendNoteOff(deviceId, channel, note, velocity): void`
- `sendCC(deviceId, channel, cc, value): void`
- `dispose(): void`

### MIDIMappingEngine

**Methods:**
- `addMapping(mapping: MIDIMapping): void`
- `removeMapping(id: string): void`
- `updateMapping(id: string, updates): void`
- `processMIDIMessage(message): MIDIMapping | null`
- `mapValue(midiValue: number, mapping): number`
- `startLearn(targetType, targetId, targetParameter, onLearn): void`
- `stopLearn(): void`
- `isLearning(): boolean`
- `getAllMappings(): MIDIMapping[]`
- `importMappings(mappings): void`
- `exportMappings(): MIDIMapping[]`

---

## Browser Compatibility

### Web Audio API
- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Edge: ✅ Full support

### Web MIDI API
- Chrome: ✅ Full support
- Firefox: ❌ Not supported (requires flag)
- Safari: ❌ Not supported
- Edge: ✅ Full support

**Note:** For MIDI support, recommend Chrome or Edge browsers.

---

## Performance Considerations

1. **Audio Analysis:** Runs at 60fps by default. Adjust `targetFPS` if needed.
2. **Smoothing:** Higher smoothing values reduce jitter but increase latency.
3. **FFT Size:** Larger FFT size = better frequency resolution but more CPU usage.
4. **MIDI:** Very low overhead, processes messages in real-time.

---

## Troubleshooting

### Audio Context Suspended
**Problem:** Audio context is suspended on page load.
**Solution:** Call `resume()` after user interaction (click, touch, etc.).

```typescript
const { resume } = useAudioReactivity();

useEffect(() => {
  const handleClick = () => resume();
  document.addEventListener('click', handleClick, { once: true });
  return () => document.removeEventListener('click', handleClick);
}, [resume]);
```

### MIDI Not Working
**Problem:** MIDI devices not detected.
**Solutions:**
1. Check browser compatibility (Chrome/Edge only)
2. Connect MIDI device before opening app
3. Grant MIDI permissions when prompted
4. Try refreshing the page after connecting device

### Beat Detection Inaccurate
**Problem:** BPM detection not accurate.
**Solutions:**
1. Adjust sensitivity (lower for less beats, higher for more)
2. Use manual BPM or tap tempo for precise control
3. Ensure audio has clear bass/kick drum

---

## License

Part of the VJ Webapp project.
