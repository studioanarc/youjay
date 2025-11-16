import React from 'react';
import { useVJStore } from '../store';
import { Panel } from './Panel';
import { Slider } from './Slider';
import { IconButton } from './IconButton';
import type { CuePoint } from '../types';
import styles from './LayerControls.module.css';

export const LayerControls: React.FC = () => {
  const { layers, selectedLayerId, updateLayer } = useVJStore();

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  if (!selectedLayer) {
    return (
      <Panel title="Layer Controls">
        <div className={styles.empty}>
          <p>Select a layer to view controls</p>
        </div>
      </Panel>
    );
  }

  const addCuePoint = () => {
    const newCuePoint: CuePoint = {
      id: `cue-${Date.now()}`,
      time: 0,
      label: `Cue ${selectedLayer.cuePoints.length + 1}`,
      color: '#00d9ff',
    };
    updateLayer(selectedLayer.id, {
      cuePoints: [...selectedLayer.cuePoints, newCuePoint],
    });
  };

  const removeCuePoint = (cueId: string) => {
    updateLayer(selectedLayer.id, {
      cuePoints: selectedLayer.cuePoints.filter((c) => c.id !== cueId),
    });
  };

  const updateCuePoint = (cueId: string, updates: Partial<CuePoint>) => {
    updateLayer(selectedLayer.id, {
      cuePoints: selectedLayer.cuePoints.map((c) =>
        c.id === cueId ? { ...c, ...updates } : c
      ),
    });
  };

  return (
    <Panel title={`Controls: ${selectedLayer.name}`}>
      <div className={styles.controls}>
        <Slider
          label="Volume"
          value={selectedLayer.volume}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => updateLayer(selectedLayer.id, { volume: value })}
        />

        <Slider
          label="Speed"
          value={selectedLayer.speed}
          min={0.1}
          max={3}
          step={0.1}
          onChange={(value) => updateLayer(selectedLayer.id, { speed: value })}
          valueFormatter={(v) => `${v.toFixed(1)}x`}
        />

        <div className={styles.toggleGroup}>
          <label className={styles.toggleLabel}>Loop</label>
          <button
            className={`${styles.toggle} ${selectedLayer.loop ? styles.active : ''}`}
            onClick={() => updateLayer(selectedLayer.id, { loop: !selectedLayer.loop })}
          >
            {selectedLayer.loop ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className={styles.timeInputs}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Start Time (s)</label>
            <input
              type="number"
              value={selectedLayer.startTime}
              onChange={(e) =>
                updateLayer(selectedLayer.id, { startTime: parseFloat(e.target.value) || 0 })
              }
              min={0}
              step={0.1}
              className={styles.input}
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>End Time (s)</label>
            <input
              type="number"
              value={selectedLayer.endTime || ''}
              onChange={(e) =>
                updateLayer(selectedLayer.id, {
                  endTime: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              min={0}
              step={0.1}
              placeholder="None"
              className={styles.input}
            />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>Cue Points</h4>
            <IconButton icon="+" size="sm" variant="primary" onClick={addCuePoint} />
          </div>
          <div className={styles.cuePoints}>
            {selectedLayer.cuePoints.length === 0 ? (
              <p className={styles.emptyText}>No cue points</p>
            ) : (
              selectedLayer.cuePoints.map((cue) => (
                <div key={cue.id} className={styles.cuePoint}>
                  <input
                    type="color"
                    value={cue.color}
                    onChange={(e) => updateCuePoint(cue.id, { color: e.target.value })}
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={cue.label}
                    onChange={(e) => updateCuePoint(cue.id, { label: e.target.value })}
                    className={styles.cueLabel}
                  />
                  <input
                    type="number"
                    value={cue.time}
                    onChange={(e) =>
                      updateCuePoint(cue.id, { time: parseFloat(e.target.value) || 0 })
                    }
                    min={0}
                    step={0.1}
                    className={styles.cueTime}
                  />
                  <IconButton
                    icon="×"
                    size="sm"
                    variant="danger"
                    onClick={() => removeCuePoint(cue.id)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
};
