/**
 * Audio & MIDI Integration Example
 *
 * This example demonstrates how to integrate audio reactivity and MIDI controller
 * support into the VJ webapp. Use this as a reference for implementing these
 * features in your components.
 */

import { useEffect, useRef } from 'react';
import { useAudioReactivity } from '../hooks/useAudioReactivity';
import { useMIDI } from '../hooks/useMIDI';
import { useBPM } from '../hooks/useBPM';
import { useVJStore } from '../store';
import { applyMIDIMapping } from '../utils/midiMapping';
import type { MIDIMapping } from '../types';

export function AudioMIDIIntegration() {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Get store state and actions
  const layers = useVJStore((state) => state.layers);
  const midiMappings = useVJStore((state) => state.midiMappings);
  const addMidiMapping = useVJStore((state) => state.addMidiMapping);
  const setBpm = useVJStore((state) => state.setBpm);
  const midiLearnMode = useVJStore((state) => state.midiLearnMode);
  const midiLearnTarget = useVJStore((state) => state.midiLearnTarget);
  const setMidiLearnMode = useVJStore((state) => state.setMidiLearnMode);

  // Initialize audio reactivity
  const {
    audioData,
    isInitialized: audioInitialized,
    initialize: initializeAudio,
    resume: resumeAudio,
    error: audioError,
  } = useAudioReactivity({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    smoothingFactor: 0.8,
    enabled: true,
    targetFPS: 60,
  });

  // Initialize BPM detection
  const {
    bpm,
    confidence,
    beatDetected,
    beatPhase,
    isOnBeat,
    tap,
    setBPM: manualSetBPM,
  } = useBPM(audioData, {
    minBPM: 60,
    maxBPM: 180,
    sensitivity: 1.3,
    enabled: true,
    autoSync: true,
    onBeatDetected: (detectedBPM) => {
      console.log('Beat detected! BPM:', detectedBPM);
    },
    onBPMChange: (newBPM) => {
      // Update store BPM
      setBpm(newBPM);
    },
  });

  // Initialize MIDI
  const {
    isInitialized: midiInitialized,
    isSupported: midiSupported,
    inputDevices,
    mappingEngine,
    startLearn,
    stopLearn,
    isLearning,
    error: midiError,
  } = useMIDI({
    autoConnect: true,
    onMessage: (message) => {
      // Process MIDI message
      const mapping = mappingEngine.processMIDIMessage(message);

      if (mapping && message.type === 'cc') {
        // Map MIDI value to parameter value
        const paramValue = mappingEngine.mapValue(message.value, mapping);

        // Apply to layers/effects
        applyMIDIMapping(mapping, paramValue, layers);
      }
    },
    onDeviceConnected: (device) => {
      console.log('MIDI device connected:', device.name);
    },
    onDeviceDisconnected: (device) => {
      console.log('MIDI device disconnected:', device.name);
    },
  });

  // Initialize audio when video element is ready
  useEffect(() => {
    if (videoRef.current && !audioInitialized) {
      initializeAudio(videoRef.current);
    }
  }, [videoRef.current, audioInitialized, initializeAudio]);

  // Resume audio context on user interaction (required by browsers)
  useEffect(() => {
    const handleUserInteraction = () => {
      if (audioInitialized) {
        resumeAudio();
      }
    };

    document.addEventListener('click', handleUserInteraction, { once: true });

    return () => {
      document.removeEventListener('click', handleUserInteraction);
    };
  }, [audioInitialized, resumeAudio]);

  // Load MIDI mappings from store into mapping engine
  useEffect(() => {
    if (midiInitialized) {
      mappingEngine.clearMappings();
      midiMappings.forEach((mapping) => {
        mappingEngine.addMapping(mapping);
      });
    }
  }, [midiMappings, midiInitialized, mappingEngine]);

  // Handle MIDI learn mode
  useEffect(() => {
    if (midiLearnMode && midiLearnTarget && midiInitialized) {
      startLearn(
        midiLearnTarget.type,
        midiLearnTarget.id,
        midiLearnTarget.parameter,
        (mapping) => {
          // Add mapping to store
          if (mapping.id) {
            addMidiMapping(mapping as MIDIMapping);
          }
          // Exit learn mode
          setMidiLearnMode(false);
        }
      );
    } else if (!midiLearnMode && isLearning) {
      stopLearn();
    }
  }, [
    midiLearnMode,
    midiLearnTarget,
    midiInitialized,
    isLearning,
    startLearn,
    stopLearn,
    addMidiMapping,
    setMidiLearnMode,
  ]);

  // Example: Apply audio reactivity to a layer's opacity
  useEffect(() => {
    if (audioData && layers.length > 0) {
      // Example: Make layer opacity reactive to bass
      // In a real implementation, this would be driven by audioReactivity settings
      // layers[0].opacity = audioData.bass;

      // Example: Pulse effect on beats
      if (beatDetected) {
        console.log('Beat!', beatPhase);
      }
    }
  }, [audioData, layers, beatDetected, beatPhase]);

  return (
    <div className="audio-midi-integration">
      <h2>Audio & MIDI Integration</h2>

      {/* Audio Reactivity Status */}
      <div className="audio-status">
        <h3>Audio Reactivity</h3>
        <p>Status: {audioInitialized ? 'Initialized' : 'Not initialized'}</p>
        {audioError && <p className="error">Error: {audioError}</p>}

        {audioData && (
          <div className="audio-data">
            <div>Bass: {(audioData.bass * 100).toFixed(0)}%</div>
            <div>Mid: {(audioData.mid * 100).toFixed(0)}%</div>
            <div>Treble: {(audioData.treble * 100).toFixed(0)}%</div>
            <div>Amplitude: {(audioData.amplitude * 100).toFixed(0)}%</div>
          </div>
        )}
      </div>

      {/* BPM Detection */}
      <div className="bpm-status">
        <h3>BPM Detection</h3>
        <p>BPM: {bpm}</p>
        <p>Confidence: {(confidence * 100).toFixed(0)}%</p>
        <p>Beat Phase: {(beatPhase * 100).toFixed(0)}%</p>
        <p>On Beat: {isOnBeat ? 'Yes' : 'No'}</p>
        <button onClick={tap}>Tap Tempo</button>
        <button onClick={() => manualSetBPM(120)}>Set BPM to 120</button>
      </div>

      {/* MIDI Status */}
      <div className="midi-status">
        <h3>MIDI</h3>
        <p>Supported: {midiSupported ? 'Yes' : 'No'}</p>
        <p>Status: {midiInitialized ? 'Initialized' : 'Not initialized'}</p>
        {midiError && <p className="error">Error: {midiError}</p>}

        <div className="midi-devices">
          <h4>Connected Devices ({inputDevices.length})</h4>
          <ul>
            {inputDevices.map((device) => (
              <li key={device.id}>
                {device.name} ({device.manufacturer}) - {device.state}
              </li>
            ))}
          </ul>
        </div>

        <div className="midi-mappings">
          <h4>MIDI Mappings ({midiMappings.length})</h4>
          <ul>
            {midiMappings.map((mapping) => (
              <li key={mapping.id}>
                CC{mapping.cc} (Ch {mapping.channel}) → {mapping.targetType}/{mapping.targetParameter}
              </li>
            ))}
          </ul>
        </div>

        {midiLearnMode && (
          <div className="midi-learn">
            <p>MIDI Learn Mode Active</p>
            <p>Move a control on your MIDI device to map it...</p>
            <button onClick={() => setMidiLearnMode(false)}>Cancel</button>
          </div>
        )}

        {!midiLearnMode && (
          <button
            onClick={() =>
              setMidiLearnMode(true, {
                type: 'layer',
                id: layers[0]?.id || '',
                parameter: 'opacity',
              })
            }
          >
            Start MIDI Learn (Layer Opacity)
          </button>
        )}
      </div>

      {/* Hidden video element for audio analysis */}
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        crossOrigin="anonymous"
      />
    </div>
  );
}

/**
 * Example: Using audio reactivity in a custom component
 */
export function AudioReactiveEffect() {
  // Get audio reactivity hook
  const { audioData: currentAudio } = useAudioReactivity({
    enabled: true,
    targetFPS: 60,
  });

  if (!currentAudio) return null;

  // Example: Create visual effect based on audio
  const bassScale = 1 + currentAudio.bass * 0.5;
  const hueRotate = currentAudio.treble * 360;

  return (
    <div
      className="audio-reactive-effect"
      style={{
        transform: `scale(${bassScale})`,
        filter: `hue-rotate(${hueRotate}deg)`,
        transition: 'all 0.1s ease-out',
      }}
    >
      Audio Reactive Element
    </div>
  );
}

/**
 * Example: MIDI-controlled parameter
 */
export function MIDIControlledParameter({ layerId, parameter }: { layerId: string; parameter: string }) {
  const setMidiLearnMode = useVJStore((state) => state.setMidiLearnMode);
  const midiLearnMode = useVJStore((state) => state.midiLearnMode);
  const midiLearnTarget = useVJStore((state) => state.midiLearnTarget);

  const isLearningThis =
    midiLearnMode &&
    midiLearnTarget?.type === 'layer' &&
    midiLearnTarget?.id === layerId &&
    midiLearnTarget?.parameter === parameter;

  return (
    <button
      className={`midi-learn-button ${isLearningThis ? 'learning' : ''}`}
      onClick={() => {
        if (isLearningThis) {
          setMidiLearnMode(false);
        } else {
          setMidiLearnMode(true, {
            type: 'layer',
            id: layerId,
            parameter,
          });
        }
      }}
    >
      {isLearningThis ? 'Learning...' : 'MIDI Learn'}
    </button>
  );
}
