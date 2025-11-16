import React, { useRef, useState, useCallback } from 'react';
import styles from './Slider.module.css';

interface SliderProps {
  label?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  disabled?: boolean;
  color?: 'primary' | 'secondary';
}

export const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  showValue = true,
  valueFormatter = (v) => v.toFixed(2),
  disabled = false,
  color = 'primary',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      setIsDragging(true);
      updateValue(e.clientX);
    },
    [disabled]
  );

  const updateValue = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const newValue = min + percent * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      onChange(Math.max(min, Math.min(max, steppedValue)));
    },
    [min, max, step, onChange]
  );

  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateValue(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValue]);

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`${styles.slider} ${disabled ? styles.disabled : ''}`}>
      {label && (
        <div className={styles.labelRow}>
          <label className={styles.label}>{label}</label>
          {showValue && <span className={styles.value}>{valueFormatter(value)}</span>}
        </div>
      )}
      <div
        ref={trackRef}
        className={styles.track}
        onMouseDown={handleMouseDown}
      >
        <div
          className={`${styles.fill} ${styles[color]}`}
          style={{ width: `${percentage}%` }}
        />
        <div
          className={`${styles.thumb} ${styles[color]}`}
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
