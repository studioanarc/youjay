/**
 * ShaderEditor - Monaco editor for GLSL code with live preview
 */

import React, { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { ShaderPreview } from './ShaderPreview';
import { UniformControls } from './UniformControls';
import { useVJStore } from '../store';
import type { CustomShader, ShaderUniform } from '../types';

interface ShaderEditorProps {
  shaderId?: string;
  onClose?: () => void;
}

const SHADER_TEMPLATES = {
  basic: {
    name: 'Basic Passthrough',
    fragmentShader: `precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

varying vec2 vTexCoord;

void main() {
  vec4 color = texture2D(uTexture, vTexCoord);
  gl_FragColor = color;
}`,
    uniforms: {},
  },
  hueShift: {
    name: 'Hue Shift',
    fragmentShader: `precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHueShift;

varying vec2 vTexCoord;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec4 color = texture2D(uTexture, vTexCoord);
  vec3 hsv = rgb2hsv(color.rgb);
  hsv.x = mod(hsv.x + uHueShift, 1.0);
  gl_FragColor = vec4(hsv2rgb(hsv), color.a);
}`,
    uniforms: {
      uHueShift: {
        type: 'float',
        value: 0.0,
        min: 0.0,
        max: 1.0,
        label: 'Hue Shift',
      },
    },
  },
  kaleidoscope: {
    name: 'Kaleidoscope',
    fragmentShader: `precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uSegments;

varying vec2 vTexCoord;

void main() {
  vec2 uv = vTexCoord - 0.5;
  float angle = atan(uv.y, uv.x);
  float radius = length(uv);

  float segmentAngle = 3.14159265359 * 2.0 / uSegments;
  angle = mod(angle, segmentAngle);
  if (mod(floor(atan(uv.y, uv.x) / segmentAngle), 2.0) < 1.0) {
    angle = segmentAngle - angle;
  }

  vec2 newUV = vec2(cos(angle), sin(angle)) * radius + 0.5;
  gl_FragColor = texture2D(uTexture, newUV);
}`,
    uniforms: {
      uSegments: {
        type: 'float',
        value: 6.0,
        min: 2.0,
        max: 20.0,
        label: 'Segments',
      },
    },
  },
  glitch: {
    name: 'Digital Glitch',
    fragmentShader: `precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uGlitchAmount;

varying vec2 vTexCoord;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = vTexCoord;

  // Block glitch effect
  float blockSize = 20.0;
  vec2 blockUV = floor(uv * vec2(uResolution.x / blockSize, uResolution.y / blockSize));
  float glitch = random(blockUV + floor(uTime * 5.0));

  if (glitch < uGlitchAmount * 0.1) {
    uv.x += (random(blockUV) - 0.5) * uGlitchAmount * 0.2;
  }

  // RGB shift
  float shift = uGlitchAmount * 0.02;
  float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
  float g = texture2D(uTexture, uv).g;
  float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}`,
    uniforms: {
      uGlitchAmount: {
        type: 'float',
        value: 0.5,
        min: 0.0,
        max: 1.0,
        label: 'Glitch Intensity',
      },
    },
  },
  pixelate: {
    name: 'Pixelate',
    fragmentShader: `precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPixelSize;

varying vec2 vTexCoord;

void main() {
  vec2 pixelSize = vec2(uPixelSize) / uResolution;
  vec2 uv = floor(vTexCoord / pixelSize) * pixelSize;
  gl_FragColor = texture2D(uTexture, uv);
}`,
    uniforms: {
      uPixelSize: {
        type: 'float',
        value: 8.0,
        min: 1.0,
        max: 50.0,
        label: 'Pixel Size',
      },
    },
  },
  colorGrade: {
    name: 'Color Grading',
    fragmentShader: `precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uHighlights;
uniform vec3 uShadows;
uniform vec3 uMidtones;
uniform float uContrast;

varying vec2 vTexCoord;

void main() {
  vec4 color = texture2D(uTexture, vTexCoord);

  // Calculate luminance
  float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

  // Apply color grading based on luminance
  vec3 graded = color.rgb;
  graded = mix(graded, graded * uShadows, (1.0 - lum) * 0.7);
  graded = mix(graded, graded * uMidtones, (1.0 - abs(lum - 0.5) * 2.0) * 0.7);
  graded = mix(graded, graded * uHighlights, lum * 0.7);

  // Apply contrast
  graded = mix(vec3(0.5), graded, uContrast);

  gl_FragColor = vec4(graded, color.a);
}`,
    uniforms: {
      uHighlights: {
        type: 'vec3',
        value: [1.0, 1.0, 1.0],
        label: 'Highlights',
      },
      uShadows: {
        type: 'vec3',
        value: [1.0, 1.0, 1.0],
        label: 'Shadows',
      },
      uMidtones: {
        type: 'vec3',
        value: [1.0, 1.0, 1.0],
        label: 'Midtones',
      },
      uContrast: {
        type: 'float',
        value: 1.0,
        min: 0.0,
        max: 2.0,
        label: 'Contrast',
      },
    },
  },
};

export const ShaderEditor: React.FC<ShaderEditorProps> = ({ shaderId, onClose }) => {
  const { customShaders, addCustomShader, updateCustomShader } = useVJStore();

  const existingShader = shaderId
    ? customShaders.find((s) => s.id === shaderId)
    : null;

  const [shaderName, setShaderName] = useState(existingShader?.name || 'New Shader');
  const [fragmentShader, setFragmentShader] = useState(
    existingShader?.fragmentShader || SHADER_TEMPLATES.basic.fragmentShader
  );
  const [uniforms, setUniforms] = useState<Record<string, ShaderUniform>>(
    existingShader?.uniforms || {}
  );
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof SHADER_TEMPLATES>('basic');
  const [showTemplates, setShowTemplates] = useState(!existingShader);

  // Parse uniforms from shader code
  const parseUniforms = useCallback((code: string) => {
    const uniformRegex = /uniform\s+(\w+)\s+(\w+)\s*;/g;
    const newUniforms: Record<string, ShaderUniform> = {};

    let match;
    while ((match = uniformRegex.exec(code)) !== null) {
      const [, type, name] = match;

      // Skip built-in uniforms
      if (['uTexture', 'uResolution', 'uTime'].includes(name)) continue;

      // Preserve existing uniform values if they exist
      if (uniforms[name]) {
        newUniforms[name] = uniforms[name];
        continue;
      }

      // Create default uniform based on type
      switch (type) {
        case 'float':
          newUniforms[name] = {
            type: 'float',
            value: 0.5,
            min: 0.0,
            max: 1.0,
            label: name,
          };
          break;
        case 'vec2':
          newUniforms[name] = {
            type: 'vec2',
            value: [0.0, 0.0],
            label: name,
          };
          break;
        case 'vec3':
          newUniforms[name] = {
            type: 'vec3',
            value: [1.0, 1.0, 1.0],
            label: name,
          };
          break;
        case 'vec4':
          newUniforms[name] = {
            type: 'vec4',
            value: [1.0, 1.0, 1.0, 1.0],
            label: name,
          };
          break;
        case 'sampler2D':
          newUniforms[name] = {
            type: 'sampler2D',
            value: null,
            label: name,
          };
          break;
      }
    }

    setUniforms(newUniforms);
  }, [uniforms]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value) {
      setFragmentShader(value);
      parseUniforms(value);
    }
  }, [parseUniforms]);

  const handleUniformChange = useCallback((name: string, value: any) => {
    setUniforms((prev) => ({
      ...prev,
      [name]: { ...prev[name], value },
    }));
  }, []);

  const handleTemplateSelect = useCallback((templateKey: keyof typeof SHADER_TEMPLATES) => {
    const template = SHADER_TEMPLATES[templateKey];
    setSelectedTemplate(templateKey);
    setFragmentShader(template.fragmentShader);
    setUniforms(template.uniforms as Record<string, ShaderUniform>);
    setShaderName(template.name);
    setShowTemplates(false);
  }, []);

  const handleSave = useCallback(() => {
    const shader: CustomShader = {
      id: shaderId || `shader-${Date.now()}`,
      name: shaderName,
      fragmentShader,
      uniforms,
    };

    if (shaderId) {
      updateCustomShader(shaderId, shader);
    } else {
      addCustomShader(shader);
    }

    onClose?.();
  }, [shaderId, shaderName, fragmentShader, uniforms, addCustomShader, updateCustomShader, onClose]);

  const handleExportPreset = useCallback(() => {
    const shader: CustomShader = {
      id: `shader-${Date.now()}`,
      name: shaderName,
      fragmentShader,
      uniforms,
    };

    const dataStr = JSON.stringify(shader, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${shaderName.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [shaderName, fragmentShader, uniforms]);

  const currentShader: CustomShader = {
    id: shaderId || 'preview',
    name: shaderName,
    fragmentShader,
    uniforms,
  };

  return (
    <div className="shader-editor">
      <div className="shader-editor-header">
        <input
          type="text"
          value={shaderName}
          onChange={(e) => setShaderName(e.target.value)}
          className="shader-name-input"
          placeholder="Shader name..."
        />
        <div className="header-actions">
          <button onClick={() => setShowTemplates(!showTemplates)} className="btn-secondary">
            {showTemplates ? 'Hide' : 'Show'} Templates
          </button>
          <button onClick={handleExportPreset} className="btn-secondary">
            Export
          </button>
          <button onClick={handleSave} className="btn-primary">
            Save
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-close">
              ✕
            </button>
          )}
        </div>
      </div>

      {showTemplates && (
        <div className="templates-panel">
          <h3>Shader Templates</h3>
          <div className="templates-grid">
            {Object.entries(SHADER_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                onClick={() => handleTemplateSelect(key as keyof typeof SHADER_TEMPLATES)}
                className={`template-card ${selectedTemplate === key ? 'active' : ''}`}
              >
                {template.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="shader-editor-content">
        <div className="editor-panel">
          <h3>Fragment Shader (GLSL)</h3>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="cpp"
              value={fragmentShader}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </div>

        <div className="preview-panel">
          <h3>Preview</h3>
          <ShaderPreview shader={currentShader} width={400} height={300} />

          <div className="controls-section">
            <UniformControls uniforms={uniforms} onUniformChange={handleUniformChange} />
          </div>
        </div>
      </div>

      <style>{`
        .shader-editor {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #1e1e1e;
          color: #e0e0e0;
        }

        .shader-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .shader-name-input {
          flex: 1;
          max-width: 300px;
          padding: 8px 12px;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #e0e0e0;
          font-size: 16px;
          font-weight: 600;
        }

        .shader-name-input:focus {
          outline: none;
          border-color: #4a9eff;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-primary,
        .btn-secondary,
        .btn-close {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4a9eff;
          color: #fff;
        }

        .btn-primary:hover {
          background: #3a8eef;
        }

        .btn-secondary {
          background: #3c3c3c;
          color: #e0e0e0;
          border: 1px solid #555;
        }

        .btn-secondary:hover {
          background: #4c4c4c;
        }

        .btn-close {
          background: transparent;
          color: #e0e0e0;
          padding: 8px 12px;
        }

        .btn-close:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .templates-panel {
          padding: 16px 24px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .templates-panel h3 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
        }

        .templates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 8px;
        }

        .template-card {
          padding: 12px;
          background: #3c3c3c;
          border: 1px solid #555;
          border-radius: 4px;
          color: #e0e0e0;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .template-card:hover {
          background: #4c4c4c;
          border-color: #4a9eff;
        }

        .template-card.active {
          background: #4a9eff;
          border-color: #4a9eff;
          color: #fff;
        }

        .shader-editor-content {
          display: grid;
          grid-template-columns: 1fr 450px;
          flex: 1;
          overflow: hidden;
        }

        .editor-panel,
        .preview-panel {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .editor-panel {
          border-right: 1px solid #3e3e42;
        }

        .editor-panel h3,
        .preview-panel h3 {
          margin: 0;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 600;
          background: #2d2d30;
          border-bottom: 1px solid #3e3e42;
        }

        .editor-container {
          flex: 1;
          overflow: hidden;
        }

        .preview-panel {
          overflow-y: auto;
        }

        .preview-panel > div:first-of-type {
          margin: 16px;
        }

        .controls-section {
          margin: 16px;
          margin-top: 0;
        }

        @media (max-width: 1024px) {
          .shader-editor-content {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 400px;
          }

          .editor-panel {
            border-right: none;
            border-bottom: 1px solid #3e3e42;
          }
        }
      `}</style>
    </div>
  );
};
