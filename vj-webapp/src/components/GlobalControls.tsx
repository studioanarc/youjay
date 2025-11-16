import React from 'react';
import { useVJStore } from '../store';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Slider } from './Slider';
import styles from './GlobalControls.module.css';

export const GlobalControls: React.FC = () => {
  const {
    isPlaying,
    setIsPlaying,
    masterOpacity,
    setMasterOpacity,
    bpm,
    setBpm,
    recordingState,
    setRecordingState,
  } = useVJStore();

  const toggleRecording = () => {
    if (recordingState.isRecording) {
      setRecordingState({ isRecording: false, isPaused: false });
    } else {
      setRecordingState({ isRecording: true, isPaused: false, duration: 0 });
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.playControls}>
          <IconButton
            icon={isPlaying ? '⏸' : '▶'}
            size="lg"
            variant="primary"
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause' : 'Play'}
          />
          <IconButton
            icon="⏹"
            size="lg"
            variant="default"
            onClick={() => setIsPlaying(false)}
            title="Stop"
          />
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sliderSection}>
          <Slider
            label="Master Opacity"
            value={masterOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={setMasterOpacity}
          />
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.bpmControl}>
          <label className={styles.label}>BPM</label>
          <div className={styles.bpmInput}>
            <IconButton
              icon="-"
              size="sm"
              onClick={() => setBpm(Math.max(20, bpm - 1))}
              title="Decrease BPM"
            />
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
              min={20}
              max={300}
              className={styles.bpmValue}
            />
            <IconButton
              icon="+"
              size="sm"
              onClick={() => setBpm(Math.min(300, bpm + 1))}
              title="Increase BPM"
            />
          </div>
          <div className={styles.bpmTap}>
            <Button size="sm" variant="ghost">
              TAP
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.recordingControls}>
          <Button
            variant={recordingState.isRecording ? 'danger' : 'secondary'}
            size="md"
            onClick={toggleRecording}
          >
            {recordingState.isRecording ? (
              <>
                <span className={styles.recordingDot} />
                REC {formatDuration(recordingState.duration)}
              </>
            ) : (
              '● Record'
            )}
          </Button>
          {recordingState.isRecording && (
            <IconButton
              icon={recordingState.isPaused ? '▶' : '⏸'}
              size="md"
              onClick={() =>
                setRecordingState({ isPaused: !recordingState.isPaused })
              }
              title={recordingState.isPaused ? 'Resume' : 'Pause'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
