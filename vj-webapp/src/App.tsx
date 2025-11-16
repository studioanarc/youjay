/**
 * Main App Component
 * Integrates all VJ webapp components into a cohesive application
 */

import { useEffect, useState, useRef } from 'react';
import { VideoCompositor } from './engine/VideoCompositor';
import { LayerPanel } from './components/LayerPanel';
import { EffectsPanel } from './components/EffectsPanel';
import { TransitionControl } from './components/TransitionControl';
import { GlobalControls } from './components/GlobalControls';
import { VideoSelector } from './components/VideoSelector';
import { PresetBrowser } from './components/PresetBrowser';
import { RecordingControls } from './components/RecordingControls';
import { ShaderEditor } from './components/ShaderEditor';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMIDI } from './hooks/useMIDI';
import { useAudioReactivity } from './hooks/useAudioReactivity';
import { getAllPresets } from './utils/presetStorage';
import { initDB, closeDB } from './utils/db';
import { useVJStore } from './store';
import styles from './App.module.css';

function App() {
  const [shaderEditorOpen, setShaderEditorOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<'effects' | 'transition' | 'videos' | 'presets'>('effects');
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null as unknown as HTMLCanvasElement);

  // Initialize keyboard shortcuts
  const { showHelp, setShowHelp } = useKeyboardShortcuts();

  // Initialize MIDI
  const midi = useMIDI({
    autoConnect: true,
    onDeviceConnected: (device) => {
      console.log('MIDI device connected:', device.name);
    },
    onDeviceDisconnected: (device) => {
      console.log('MIDI device disconnected:', device.name);
    },
  });

  // Initialize audio reactivity
  const audio = useAudioReactivity({
    enabled: true,
    fftSize: 2048,
  });

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize IndexedDB
        await initDB();

        // Load presets from IndexedDB
        const presets = await getAllPresets();

        // Load presets into store
        presets.forEach((preset) => {
          useVJStore.getState().addPreset(preset);
        });

        console.log('App initialized successfully');
        console.log('Loaded presets:', presets.length);
        console.log('MIDI initialized:', midi.isInitialized);
        console.log('Audio initialized:', audio.isInitialized);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();

    // Cleanup on unmount
    return () => {
      closeDB();
      midi.dispose();
      audio.dispose();
    };
  }, []);

  /**
   * Sync keyboard shortcuts help modal state
   */
  useEffect(() => {
    setShortcutsHelpOpen(showHelp);
  }, [showHelp]);

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner}></div>
        <p>Initializing VJ WebApp...</p>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <h1 className={styles.title}>VJ WebApp</h1>
        <div className={styles.topBarActions}>
          <button
            className={styles.topBarButton}
            onClick={() => setShaderEditorOpen(!shaderEditorOpen)}
            title="Toggle Shader Editor"
          >
            {shaderEditorOpen ? 'Hide' : 'Show'} Shader Editor
          </button>
          <button
            className={styles.topBarButton}
            onClick={() => setShowHelp(!shortcutsHelpOpen)}
            title="Keyboard Shortcuts (Press /)"
          >
            Shortcuts (/)
          </button>
          <div className={styles.statusIndicators}>
            {midi.isInitialized && (
              <span className={styles.statusBadge} title="MIDI Connected">
                MIDI
              </span>
            )}
            {audio.isInitialized && (
              <span className={styles.statusBadge} title="Audio Active">
                AUDIO
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className={styles.mainLayout}>
        {/* Left Panel - Layer Stack */}
        <aside className={styles.leftPanel}>
          <LayerPanel />
        </aside>

        {/* Center - Video Compositor */}
        <main className={styles.centerPanel}>
          <VideoCompositor />
        </main>

        {/* Right Panel - Effects, Transition, Videos, Presets */}
        <aside className={styles.rightPanel}>
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${rightPanelTab === 'effects' ? styles.tabActive : ''}`}
              onClick={() => setRightPanelTab('effects')}
            >
              Effects
            </button>
            <button
              className={`${styles.tab} ${rightPanelTab === 'transition' ? styles.tabActive : ''}`}
              onClick={() => setRightPanelTab('transition')}
            >
              Transition
            </button>
            <button
              className={`${styles.tab} ${rightPanelTab === 'videos' ? styles.tabActive : ''}`}
              onClick={() => setRightPanelTab('videos')}
            >
              Videos
            </button>
            <button
              className={`${styles.tab} ${rightPanelTab === 'presets' ? styles.tabActive : ''}`}
              onClick={() => setRightPanelTab('presets')}
            >
              Presets
            </button>
          </div>
          <div className={styles.tabContent}>
            {rightPanelTab === 'effects' && <EffectsPanel />}
            {rightPanelTab === 'transition' && <TransitionControl />}
            {rightPanelTab === 'videos' && <VideoSelector />}
            {rightPanelTab === 'presets' && <PresetBrowser />}
          </div>
        </aside>
      </div>

      {/* Bottom Bar - Global Controls & Recording */}
      <footer className={styles.bottomBar}>
        <div className={styles.bottomBarSection}>
          <GlobalControls />
        </div>
        <div className={styles.bottomBarSection}>
          <RecordingControls canvasRef={canvasRef} includeAudio={false} />
        </div>
      </footer>

      {/* Shader Editor Modal */}
      {shaderEditorOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <button
              className={styles.modalClose}
              onClick={() => setShaderEditorOpen(false)}
            >
              ×
            </button>
            <ShaderEditor />
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}

export default App;
