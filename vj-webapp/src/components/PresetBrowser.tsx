import React, { useState } from 'react';
import { useVJStore } from '../store';
import { Panel } from './Panel';
import { Button } from './Button';
import { IconButton } from './IconButton';
import type { Preset } from '../types';
import styles from './PresetBrowser.module.css';

export const PresetBrowser: React.FC = () => {
  const { presets, addPreset, removePreset, loadPreset, layers } = useVJStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'scene' | 'effect' | 'transition'>('all');

  const handleSavePreset = () => {
    if (!presetName.trim()) return;

    const newPreset: Preset = {
      id: `preset-${Date.now()}`,
      name: presetName,
      description: presetDescription,
      type: 'scene',
      data: { layers },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    addPreset(newPreset);
    setPresetName('');
    setPresetDescription('');
    setShowSaveDialog(false);
  };

  const filteredPresets = presets.filter(
    (preset) => filterType === 'all' || preset.type === filterType
  );

  return (
    <Panel
      title="Presets"
      headerActions={
        <IconButton
          icon="💾"
          size="sm"
          variant="primary"
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          active={showSaveDialog}
          title="Save Preset"
        />
      }
    >
      {showSaveDialog && (
        <div className={styles.saveDialog}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Preset Name</label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Awesome Preset"
              className={styles.input}
              autoFocus
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Description (optional)</label>
            <textarea
              value={presetDescription}
              onChange={(e) => setPresetDescription(e.target.value)}
              placeholder="Add a description..."
              className={styles.textarea}
              rows={2}
            />
          </div>
          <div className={styles.dialogActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSaveDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSavePreset}
              disabled={!presetName.trim()}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      <div className={styles.filters}>
        {(['all', 'scene', 'effect', 'transition'] as const).map((type) => (
          <button
            key={type}
            className={`${styles.filterButton} ${filterType === type ? styles.active : ''}`}
            onClick={() => setFilterType(type)}
          >
            {type}
          </button>
        ))}
      </div>

      <div className={styles.presetList}>
        {filteredPresets.length === 0 ? (
          <div className={styles.empty}>
            <p>No presets saved yet</p>
            <p className={styles.emptyHint}>
              Save your current setup to quickly switch between different configurations
            </p>
          </div>
        ) : (
          filteredPresets.map((preset) => (
            <div key={preset.id} className={styles.preset}>
              <div className={styles.presetHeader}>
                <div className={styles.presetInfo}>
                  <h4 className={styles.presetName}>{preset.name}</h4>
                  <span className={styles.presetType}>{preset.type}</span>
                </div>
                <div className={styles.presetActions}>
                  <IconButton
                    icon="▶"
                    size="sm"
                    variant="primary"
                    onClick={() => loadPreset(preset.id)}
                    title="Load preset"
                  />
                  <IconButton
                    icon="×"
                    size="sm"
                    variant="danger"
                    onClick={() => removePreset(preset.id)}
                    title="Delete preset"
                  />
                </div>
              </div>
              {preset.description && (
                <p className={styles.presetDescription}>{preset.description}</p>
              )}
              <div className={styles.presetMeta}>
                <span className={styles.metaItem}>
                  Created: {new Date(preset.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
};
