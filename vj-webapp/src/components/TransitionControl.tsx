import React from 'react';
import { useVJStore } from '../store';
import { Panel } from './Panel';
import { Slider } from './Slider';
import type { TransitionType, EasingFunction } from '../types';
import styles from './TransitionControl.module.css';

const TRANSITION_TYPES: TransitionType[] = [
  'crossfade',
  'wipe-horizontal',
  'wipe-vertical',
  'wipe-diagonal',
  'wipe-circular',
  'zoom-in',
  'zoom-out',
  'rotate',
  'glitch',
  'pixelate',
  'none',
];

const EASING_FUNCTIONS: EasingFunction[] = [
  'linear',
  'ease-in',
  'ease-out',
  'ease-in-out',
  'cubic-bezier',
];

export const TransitionControl: React.FC = () => {
  const { transition, setTransition } = useVJStore();

  return (
    <Panel title="Transition">
      <div className={styles.controls}>
        <div className={styles.selectGroup}>
          <label className={styles.label}>Type</label>
          <select
            value={transition.type}
            onChange={(e) =>
              setTransition({ ...transition, type: e.target.value as TransitionType })
            }
            className={styles.select}
          >
            {TRANSITION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        <Slider
          label="Duration (ms)"
          value={transition.duration}
          min={100}
          max={5000}
          step={100}
          onChange={(value) => setTransition({ ...transition, duration: value })}
          valueFormatter={(v) => `${v.toFixed(0)}ms`}
        />

        <div className={styles.selectGroup}>
          <label className={styles.label}>Easing</label>
          <select
            value={transition.easing}
            onChange={(e) =>
              setTransition({ ...transition, easing: e.target.value as EasingFunction })
            }
            className={styles.select}
          >
            {EASING_FUNCTIONS.map((easing) => (
              <option key={easing} value={easing}>
                {easing}
              </option>
            ))}
          </select>
        </div>

        {transition.type !== 'crossfade' && transition.type !== 'none' && (
          <div className={styles.preview}>
            <div className={styles.previewLabel}>Preview</div>
            <div className={styles.previewBox}>
              <div className={`${styles.previewDemo} ${styles[transition.type]}`} />
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};
