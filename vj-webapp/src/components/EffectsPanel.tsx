import React, { useState } from 'react';
import { useVJStore } from '../store';
import { Panel } from './Panel';
import { IconButton } from './IconButton';
import { Slider } from './Slider';
import type { Effect, EffectType } from '../types';
import styles from './EffectsPanel.module.css';

const EFFECT_TYPES: EffectType[] = [
  'blur',
  'brightness',
  'contrast',
  'saturation',
  'hue',
  'pixelate',
  'kaleidoscope',
  'mirror',
  'edge-detect',
  'posterize',
  'glitch',
  'chromakey',
  'feedback',
  'rgb-shift',
  'vhs',
  'crt',
  'bloom',
];

const EFFECT_PARAMS: Record<string, { label: string; min: number; max: number; default: number }> = {
  amount: { label: 'Amount', min: 0, max: 1, default: 0.5 },
  intensity: { label: 'Intensity', min: 0, max: 2, default: 1 },
  radius: { label: 'Radius', min: 0, max: 50, default: 5 },
  threshold: { label: 'Threshold', min: 0, max: 1, default: 0.5 },
  segments: { label: 'Segments', min: 2, max: 16, default: 6 },
  angle: { label: 'Angle', min: 0, max: 360, default: 0 },
  shift: { label: 'Shift', min: 0, max: 0.1, default: 0.01 },
  levels: { label: 'Levels', min: 2, max: 32, default: 8 },
  color: { label: 'Color', min: 0, max: 360, default: 120 },
  tolerance: { label: 'Tolerance', min: 0, max: 1, default: 0.2 },
};

const DEFAULT_PARAMS: Record<EffectType, Record<string, number>> = {
  blur: { radius: 5 },
  brightness: { amount: 0 },
  contrast: { amount: 0 },
  saturation: { amount: 1 },
  hue: { angle: 0 },
  pixelate: { amount: 10 },
  kaleidoscope: { segments: 6, angle: 0 },
  mirror: { angle: 0 },
  'edge-detect': { threshold: 0.5 },
  posterize: { levels: 8 },
  glitch: { intensity: 0.5, amount: 0.1 },
  chromakey: { color: 120, tolerance: 0.2 },
  feedback: { amount: 0.5, intensity: 0.8 },
  'rgb-shift': { shift: 0.01, angle: 0 },
  vhs: { intensity: 0.5 },
  crt: { intensity: 0.5 },
  bloom: { threshold: 0.7, intensity: 1 },
  custom: {},
};

export const EffectsPanel: React.FC = () => {
  const { layers, selectedLayerId, addEffect, removeEffect, updateEffect, toggleEffect } =
    useVJStore();
  const [showAddMenu, setShowAddMenu] = useState(false);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const handleAddEffect = (type: EffectType) => {
    if (!selectedLayerId) return;

    const newEffect: Effect = {
      id: `effect-${Date.now()}`,
      type,
      enabled: true,
      parameters: { ...DEFAULT_PARAMS[type] },
    };

    addEffect(selectedLayerId, newEffect);
    setShowAddMenu(false);
  };

  if (!selectedLayer) {
    return (
      <Panel title="Effects">
        <div className={styles.empty}>
          <p>Select a layer to add effects</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Effects"
      headerActions={
        <div className={styles.headerActions}>
          {selectedLayer.effects.length > 0 && (
            <span className={styles.effectCount}>{selectedLayer.effects.length}</span>
          )}
          <IconButton
            icon="+"
            size="sm"
            variant="primary"
            onClick={() => setShowAddMenu(!showAddMenu)}
            active={showAddMenu}
            title="Add Effect"
          />
        </div>
      }
    >
      {showAddMenu && (
        <div className={styles.addMenu}>
          <div className={styles.effectTypes}>
            {EFFECT_TYPES.map((type) => (
              <button
                key={type}
                className={styles.effectType}
                onClick={() => handleAddEffect(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={styles.effectsList}>
        {selectedLayer.effects.length === 0 ? (
          <p className={styles.emptyText}>No effects applied</p>
        ) : (
          selectedLayer.effects.map((effect) => (
            <div key={effect.id} className={styles.effect}>
              <div className={styles.effectHeader}>
                <h4 className={styles.effectName}>{effect.type}</h4>
                <div className={styles.effectActions}>
                  <IconButton
                    icon={effect.enabled ? '●' : '○'}
                    size="sm"
                    active={effect.enabled}
                    onClick={() => toggleEffect(selectedLayer.id, effect.id)}
                    title="Toggle effect"
                  />
                  <IconButton
                    icon="×"
                    size="sm"
                    variant="danger"
                    onClick={() => removeEffect(selectedLayer.id, effect.id)}
                    title="Remove effect"
                  />
                </div>
              </div>

              <div className={styles.effectParams}>
                {Object.entries(effect.parameters).map(([key, value]) => {
                  const paramConfig = EFFECT_PARAMS[key] || {
                    label: key,
                    min: 0,
                    max: 1,
                    default: 0.5,
                  };

                  return (
                    <Slider
                      key={key}
                      label={paramConfig.label}
                      value={value}
                      min={paramConfig.min}
                      max={paramConfig.max}
                      step={(paramConfig.max - paramConfig.min) / 100}
                      onChange={(newValue) =>
                        updateEffect(selectedLayer.id, effect.id, {
                          parameters: { ...effect.parameters, [key]: newValue },
                        })
                      }
                      disabled={!effect.enabled}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
};
