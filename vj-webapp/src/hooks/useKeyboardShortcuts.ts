import { useEffect, useState, useCallback } from 'react';
import { useVJStore } from '../store';
import { keyboardShortcutsManager } from '../utils/keyboardShortcuts';
import type { KeyboardShortcut } from '../utils/keyboardShortcuts';
import type { BlendMode } from '../types';

/**
 * Hook to setup and manage keyboard shortcuts for the VJ webapp
 *
 * This hook:
 * - Registers all default shortcuts
 * - Provides access to help modal state
 * - Handles global keyboard event listener
 * - Integrates with Zustand store for actions
 */
export function useKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);
  const store = useVJStore();

  // Get all blend modes for cycling
  const blendModes: BlendMode[] = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'add',
    'subtract',
    'difference',
    'lighten',
    'darken',
    'color-dodge',
    'color-burn',
  ];

  // Helper to get next blend mode
  const getNextBlendMode = useCallback(
    (current: BlendMode): BlendMode => {
      const currentIndex = blendModes.indexOf(current);
      const nextIndex = (currentIndex + 1) % blendModes.length;
      return blendModes[nextIndex];
    },
    [blendModes]
  );

  // Helper to select layer by index
  const selectLayerByNumber = useCallback(
    (num: number) => {
      const layer = store.layers[num - 1];
      if (layer) {
        store.setSelectedLayer(layer.id);
      }
    },
    [store]
  );

  // Helper to select next layer
  const selectNextLayer = useCallback(() => {
    const currentIndex = store.layers.findIndex(
      (l) => l.id === store.selectedLayerId
    );
    const nextIndex = (currentIndex + 1) % store.layers.length;
    store.setSelectedLayer(store.layers[nextIndex]?.id || null);
  }, [store]);

  // Helper to select previous layer
  const selectPreviousLayer = useCallback(() => {
    const currentIndex = store.layers.findIndex(
      (l) => l.id === store.selectedLayerId
    );
    const prevIndex =
      currentIndex <= 0 ? store.layers.length - 1 : currentIndex - 1;
    store.setSelectedLayer(store.layers[prevIndex]?.id || null);
  }, [store]);

  // Helper to toggle layer visibility
  const toggleLayerVisibility = useCallback(() => {
    if (store.selectedLayerId) {
      const layer = store.layers.find((l) => l.id === store.selectedLayerId);
      if (layer) {
        store.updateLayer(store.selectedLayerId, { visible: !layer.visible });
      }
    }
  }, [store]);

  // Helper to cycle blend mode
  const cycleBlendMode = useCallback(() => {
    if (store.selectedLayerId) {
      const layer = store.layers.find((l) => l.id === store.selectedLayerId);
      if (layer) {
        const nextBlendMode = getNextBlendMode(layer.blendMode);
        store.updateLayer(store.selectedLayerId, { blendMode: nextBlendMode });
      }
    }
  }, [store, getNextBlendMode]);

  // Helper to adjust opacity
  const adjustOpacity = useCallback(
    (delta: number) => {
      if (store.selectedLayerId) {
        const layer = store.layers.find((l) => l.id === store.selectedLayerId);
        if (layer) {
          const newOpacity = Math.max(0, Math.min(1, layer.opacity + delta));
          store.updateLayer(store.selectedLayerId, { opacity: newOpacity });
        }
      }
    },
    [store]
  );

  // Helper to remove selected layer
  const removeSelectedLayer = useCallback(() => {
    if (store.selectedLayerId && store.layers.length > 1) {
      store.removeLayer(store.selectedLayerId);
    }
  }, [store]);

  // Helper to toggle recording
  const toggleRecording = useCallback(() => {
    store.setRecordingState({
      isRecording: !store.recordingState.isRecording,
    });
  }, [store]);

  // Helper to export scene (save preset)
  const exportScene = useCallback(() => {
    const preset = {
      id: `preset-${Date.now()}`,
      name: `Scene ${new Date().toLocaleString()}`,
      description: 'Exported scene',
      type: 'scene' as const,
      data: { layers: store.layers },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    store.addPreset(preset);
    console.log('Scene exported as preset:', preset.name);
  }, [store]);

  // Helper to toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Register all shortcuts
  useEffect(() => {
    // Clear existing shortcuts
    keyboardShortcutsManager.clear();

    // Playback shortcuts
    const playbackShortcuts: KeyboardShortcut[] = [
      {
        key: ' ',
        description: 'Play/Pause',
        category: 'Playback',
        action: () => store.setIsPlaying(!store.isPlaying),
      },
      {
        key: 'arrowleft',
        description: 'Seek backward (if supported)',
        category: 'Playback',
        action: () => console.log('Seek backward'),
        preventDefault: true,
      },
      {
        key: 'arrowright',
        description: 'Seek forward (if supported)',
        category: 'Playback',
        action: () => console.log('Seek forward'),
        preventDefault: true,
      },
    ];

    // Layer shortcuts
    const layerShortcuts: KeyboardShortcut[] = [
      {
        key: 'l',
        description: 'Select next layer',
        category: 'Layers',
        action: selectNextLayer,
      },
      {
        key: 'k',
        description: 'Select previous layer',
        category: 'Layers',
        action: selectPreviousLayer,
      },
      {
        key: 'o',
        description: 'Toggle layer visibility',
        category: 'Layers',
        action: toggleLayerVisibility,
      },
      {
        key: 'b',
        description: 'Cycle blend mode',
        category: 'Layers',
        action: cycleBlendMode,
      },
      {
        key: 'arrowup',
        description: 'Increase opacity',
        category: 'Layers',
        action: () => adjustOpacity(0.05),
        preventDefault: true,
      },
      {
        key: 'arrowdown',
        description: 'Decrease opacity',
        category: 'Layers',
        action: () => adjustOpacity(-0.05),
        preventDefault: true,
      },
      {
        key: 'delete',
        description: 'Remove selected layer',
        category: 'Layers',
        action: removeSelectedLayer,
      },
      {
        key: 'backspace',
        description: 'Remove selected layer',
        category: 'Layers',
        action: removeSelectedLayer,
      },
      {
        key: 'n',
        ctrl: true,
        description: 'Add new layer',
        category: 'Layers',
        action: () => store.addLayer(),
      },
    ];

    // Layer number shortcuts (1-9)
    for (let i = 1; i <= 9; i++) {
      layerShortcuts.push({
        key: i.toString(),
        description: `Select layer ${i}`,
        category: 'Layers',
        action: () => selectLayerByNumber(i),
      });
    }

    // Effects shortcuts
    const effectsShortcuts: KeyboardShortcut[] = [
      {
        key: 'e',
        description: 'Open effects panel',
        category: 'Effects',
        action: () => console.log('Open effects panel'),
      },
    ];

    // Recording shortcuts
    const recordingShortcuts: KeyboardShortcut[] = [
      {
        key: 'r',
        description: 'Start/Stop recording',
        category: 'Recording',
        action: toggleRecording,
      },
    ];

    // General shortcuts
    const generalShortcuts: KeyboardShortcut[] = [
      {
        key: 's',
        description: 'Save preset',
        category: 'General',
        action: exportScene,
      },
      {
        key: 's',
        ctrl: true,
        description: 'Export scene',
        category: 'General',
        action: exportScene,
      },
      {
        key: 'z',
        ctrl: true,
        description: 'Undo (if applicable)',
        category: 'General',
        action: () => console.log('Undo'),
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        description: 'Redo (if applicable)',
        category: 'General',
        action: () => console.log('Redo'),
      },
      {
        key: 'escape',
        description: 'Close modals/panels',
        category: 'General',
        action: () => setShowHelp(false),
      },
      {
        key: 'f',
        description: 'Fullscreen output',
        category: 'General',
        action: toggleFullscreen,
      },
      {
        key: 'r',
        shift: true,
        description: 'Reset to default state',
        category: 'General',
        action: () => {
          if (confirm('Reset to default state? This will clear all layers and settings.')) {
            store.reset();
          }
        },
      },
      {
        key: '/',
        description: 'Show keyboard shortcuts help',
        category: 'General',
        action: () => setShowHelp(true),
      },
    ];

    // MIDI shortcuts
    const midiShortcuts: KeyboardShortcut[] = [
      {
        key: 'm',
        description: 'Toggle MIDI learn mode',
        category: 'MIDI',
        action: () => store.setMidiLearnMode(!store.midiLearnMode),
      },
    ];

    // Register all shortcuts
    [
      ...playbackShortcuts,
      ...layerShortcuts,
      ...effectsShortcuts,
      ...recordingShortcuts,
      ...generalShortcuts,
      ...midiShortcuts,
    ].forEach((shortcut) => {
      keyboardShortcutsManager.register(shortcut);
    });

    // Setup global keyboard event listener
    const handleKeyDown = (event: KeyboardEvent) => {
      keyboardShortcutsManager.handleKeyDown(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    store,
    selectNextLayer,
    selectPreviousLayer,
    toggleLayerVisibility,
    cycleBlendMode,
    adjustOpacity,
    removeSelectedLayer,
    selectLayerByNumber,
    toggleRecording,
    exportScene,
    toggleFullscreen,
  ]);

  return {
    showHelp,
    setShowHelp,
  };
}
