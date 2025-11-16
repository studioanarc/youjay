/**
 * UniformControls - UI controls for shader uniforms
 */

import React from 'react';
import type { ShaderUniform } from '../types';

interface UniformControlsProps {
  uniforms: Record<string, ShaderUniform>;
  onUniformChange: (name: string, value: any) => void;
}

export const UniformControls: React.FC<UniformControlsProps> = ({
  uniforms,
  onUniformChange,
}) => {
  const renderControl = (name: string, uniform: ShaderUniform) => {
    const { type, value, min, max, label } = uniform;

    switch (type) {
      case 'float':
        return (
          <div key={name} className="uniform-control">
            <label htmlFor={`uniform-${name}`}>
              {label || name}: {typeof value === 'number' ? value.toFixed(3) : value}
            </label>
            <input
              id={`uniform-${name}`}
              type="range"
              min={min ?? 0}
              max={max ?? 1}
              step={(max && min) ? (max - min) / 100 : 0.01}
              value={value as number}
              onChange={(e) => onUniformChange(name, parseFloat(e.target.value))}
            />
          </div>
        );

      case 'vec2':
        return (
          <div key={name} className="uniform-control uniform-vec2">
            <label>{label || name}</label>
            <div className="vec-inputs">
              <div className="vec-input">
                <label htmlFor={`uniform-${name}-x`}>X</label>
                <input
                  id={`uniform-${name}-x`}
                  type="number"
                  step="0.01"
                  value={value[0]}
                  onChange={(e) => {
                    const newValue = [...value];
                    newValue[0] = parseFloat(e.target.value);
                    onUniformChange(name, newValue);
                  }}
                />
              </div>
              <div className="vec-input">
                <label htmlFor={`uniform-${name}-y`}>Y</label>
                <input
                  id={`uniform-${name}-y`}
                  type="number"
                  step="0.01"
                  value={value[1]}
                  onChange={(e) => {
                    const newValue = [...value];
                    newValue[1] = parseFloat(e.target.value);
                    onUniformChange(name, newValue);
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'vec3':
        return (
          <div key={name} className="uniform-control uniform-vec3">
            <label>{label || name}</label>
            <div className="vec-inputs">
              {['x', 'y', 'z'].map((axis, index) => (
                <div key={axis} className="vec-input">
                  <label htmlFor={`uniform-${name}-${axis}`}>{axis.toUpperCase()}</label>
                  <input
                    id={`uniform-${name}-${axis}`}
                    type="number"
                    step="0.01"
                    value={value[index]}
                    onChange={(e) => {
                      const newValue = [...value];
                      newValue[index] = parseFloat(e.target.value);
                      onUniformChange(name, newValue);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'vec4':
        // Check if it's a color (all values between 0 and 1)
        const isColor = Array.isArray(value) &&
          value.every((v: number) => v >= 0 && v <= 1);

        if (isColor) {
          const toHex = (values: number[]) => {
            const r = Math.floor(values[0] * 255).toString(16).padStart(2, '0');
            const g = Math.floor(values[1] * 255).toString(16).padStart(2, '0');
            const b = Math.floor(values[2] * 255).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
          };

          const fromHex = (hex: string): number[] => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return [r, g, b, value[3]];
          };

          return (
            <div key={name} className="uniform-control uniform-color">
              <label htmlFor={`uniform-${name}`}>{label || name}</label>
              <div className="color-input-group">
                <input
                  id={`uniform-${name}`}
                  type="color"
                  value={toHex(value)}
                  onChange={(e) => onUniformChange(name, fromHex(e.target.value))}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={value[3]}
                  onChange={(e) => {
                    const newValue = [...value];
                    newValue[3] = parseFloat(e.target.value);
                    onUniformChange(name, newValue);
                  }}
                  title="Alpha"
                />
                <span className="alpha-label">α: {value[3].toFixed(2)}</span>
              </div>
            </div>
          );
        }

        return (
          <div key={name} className="uniform-control uniform-vec4">
            <label>{label || name}</label>
            <div className="vec-inputs">
              {['x', 'y', 'z', 'w'].map((axis, index) => (
                <div key={axis} className="vec-input">
                  <label htmlFor={`uniform-${name}-${axis}`}>{axis.toUpperCase()}</label>
                  <input
                    id={`uniform-${name}-${axis}`}
                    type="number"
                    step="0.01"
                    value={value[index]}
                    onChange={(e) => {
                      const newValue = [...value];
                      newValue[index] = parseFloat(e.target.value);
                      onUniformChange(name, newValue);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      case 'sampler2D':
        return (
          <div key={name} className="uniform-control uniform-sampler">
            <label>{label || name}</label>
            <span className="sampler-info">Texture input (controlled by video layer)</span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="uniform-controls">
      <h3>Shader Parameters</h3>
      {Object.entries(uniforms).length === 0 ? (
        <p className="no-uniforms">No custom uniforms defined</p>
      ) : (
        <div className="controls-list">
          {Object.entries(uniforms).map(([name, uniform]) =>
            renderControl(name, uniform)
          )}
        </div>
      )}
      <style>{`
        .uniform-controls {
          padding: 16px;
          background: #1e1e1e;
          border-radius: 8px;
          color: #e0e0e0;
        }

        .uniform-controls h3 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .controls-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .uniform-control {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .uniform-control label {
          font-size: 12px;
          font-weight: 500;
          color: #b0b0b0;
        }

        .uniform-control input[type="range"] {
          width: 100%;
          height: 4px;
          background: #333;
          outline: none;
          border-radius: 2px;
        }

        .uniform-control input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #4a9eff;
          cursor: pointer;
          border-radius: 50%;
        }

        .uniform-control input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #4a9eff;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }

        .vec-inputs {
          display: flex;
          gap: 8px;
        }

        .vec-input {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .vec-input label {
          font-size: 10px;
          text-transform: uppercase;
          color: #808080;
        }

        .vec-input input[type="number"] {
          padding: 6px 8px;
          background: #2a2a2a;
          border: 1px solid #404040;
          border-radius: 4px;
          color: #e0e0e0;
          font-size: 12px;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .vec-input input[type="number"]:focus {
          outline: none;
          border-color: #4a9eff;
        }

        .color-input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .color-input-group input[type="color"] {
          width: 48px;
          height: 32px;
          border: 1px solid #404040;
          border-radius: 4px;
          cursor: pointer;
          background: transparent;
        }

        .color-input-group input[type="range"] {
          flex: 1;
        }

        .alpha-label {
          font-size: 11px;
          color: #808080;
          min-width: 50px;
        }

        .sampler-info {
          font-size: 11px;
          color: #808080;
          font-style: italic;
        }

        .no-uniforms {
          font-size: 12px;
          color: #808080;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
