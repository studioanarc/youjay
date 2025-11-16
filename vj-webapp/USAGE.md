# VJ Webapp - Recording & Shader Editor Usage Guide

This guide covers how to use the video recording and GLSL shader editor features.

## Video Recording

### Using the Recording Hook

The `useRecorder` hook provides a simple interface for recording canvas output:

```tsx
import React, { useRef } from 'react';
import { useRecorder } from './hooks/useRecorder';

function MyVJApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    isRecording,
    isPaused,
    formattedDuration,
    formattedSize,
  } = useRecorder({
    canvasRef,
    config: {
      format: 'webm',
      quality: 'high', // 'low' | 'medium' | 'high' | 'ultra'
      fps: 60,
      videoBitrate: 10_000_000,
      audioBitrate: 128_000,
    },
    includeAudio: false,
  });

  return (
    <div>
      <canvas ref={canvasRef} />

      <div>
        {!isRecording ? (
          <button onClick={startRecording}>Start Recording</button>
        ) : (
          <>
            <button onClick={isPaused ? resumeRecording : pauseRecording}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={stopRecording}>Stop</button>
          </>
        )}

        <div>Duration: {formattedDuration}</div>
        <div>Size: {formattedSize}</div>

        <button onClick={downloadRecording}>Download</button>
      </div>
    </div>
  );
}
```

### Using the Recording Controls Component

For a ready-made UI:

```tsx
import React, { useRef } from 'react';
import { RecordingControls } from './components/RecordingControls';

function MyVJApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div>
      <canvas ref={canvasRef} />
      <RecordingControls canvasRef={canvasRef} includeAudio={false} />
    </div>
  );
}
```

### Recording Configuration

Quality presets automatically set appropriate bitrates:

- **Low**: 2.5 Mbps - Good for quick previews
- **Medium**: 5 Mbps - Balanced quality/size
- **High**: 10 Mbps - Production quality
- **Ultra**: 20 Mbps - Maximum quality

### Recording with Audio

To include audio from your WebAudio context:

```tsx
const audioContext = new AudioContext();

const recorder = useRecorder({
  canvasRef,
  includeAudio: true,
  audioContext, // Pass your audio context
});
```

Or to include microphone audio:

```tsx
const recorder = useRecorder({
  canvasRef,
  includeAudio: true,
  // Don't pass audioContext to use microphone
});
```

## GLSL Shader Editor

### Using the Shader Editor Component

The shader editor provides a full IDE for creating custom GLSL shaders:

```tsx
import React, { useState } from 'react';
import { ShaderEditor } from './components/ShaderEditor';

function MyVJApp() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingShaderId, setEditingShaderId] = useState<string | undefined>();

  return (
    <div>
      <button onClick={() => setShowEditor(true)}>
        Create Shader
      </button>

      {showEditor && (
        <ShaderEditor
          shaderId={editingShaderId}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}
```

### Shader Templates

The editor includes several built-in templates:

1. **Basic Passthrough** - Simple texture rendering
2. **Hue Shift** - RGB to HSV color manipulation
3. **Kaleidoscope** - Mirror/rotate effect
4. **Digital Glitch** - RGB shift and block distortion
5. **Pixelate** - Retro pixel effect
6. **Color Grading** - Professional color correction

### Writing Custom Shaders

All shaders have access to these built-in uniforms:

```glsl
uniform sampler2D uTexture;  // Input video texture
uniform vec2 uResolution;    // Canvas resolution
uniform float uTime;         // Time in seconds
```

Define custom uniforms in your fragment shader:

```glsl
precision mediump float;

uniform sampler2D uTexture;
uniform vec2 uResolution;
uniform float uTime;

// Custom uniforms - UI controls auto-generated
uniform float uIntensity;
uniform vec3 uColor;
uniform vec2 uOffset;

varying vec2 vTexCoord;

void main() {
  vec2 uv = vTexCoord + uOffset;
  vec4 color = texture2D(uTexture, uv);
  color.rgb *= uColor * uIntensity;
  gl_FragColor = color;
}
```

The editor will automatically:
- Parse uniform declarations
- Generate UI controls (sliders, color pickers, etc.)
- Live-compile and show errors
- Display preview with test video/image

### Shader Preview Component

Use the preview component standalone:

```tsx
import React from 'react';
import { ShaderPreview } from './components/ShaderPreview';
import type { CustomShader } from './types';

function MyShaderPreview() {
  const shader: CustomShader = {
    id: 'my-shader',
    name: 'My Effect',
    fragmentShader: `
      precision mediump float;
      uniform sampler2D uTexture;
      varying vec2 vTexCoord;

      void main() {
        vec4 color = texture2D(uTexture, vTexCoord);
        gl_FragColor = vec4(1.0 - color.rgb, color.a); // Invert
      }
    `,
    uniforms: {},
  };

  return (
    <ShaderPreview
      shader={shader}
      width={400}
      height={300}
      testImage="/path/to/test.jpg"
    />
  );
}
```

### Uniform Controls

Create custom UI for shader parameters:

```tsx
import React, { useState } from 'react';
import { UniformControls } from './components/UniformControls';
import type { ShaderUniform } from './types';

function MyControls() {
  const [uniforms, setUniforms] = useState<Record<string, ShaderUniform>>({
    uIntensity: {
      type: 'float',
      value: 0.5,
      min: 0,
      max: 1,
      label: 'Intensity',
    },
    uColor: {
      type: 'vec4',
      value: [1, 0, 0, 1], // RGBA - shows as color picker
      label: 'Tint Color',
    },
  });

  const handleChange = (name: string, value: any) => {
    setUniforms(prev => ({
      ...prev,
      [name]: { ...prev[name], value },
    }));
  };

  return <UniformControls uniforms={uniforms} onUniformChange={handleChange} />;
}
```

### Saving and Loading Shaders

Shaders are automatically saved to the Zustand store:

```tsx
import { useVJStore } from './store';

function MyComponent() {
  const { customShaders, addCustomShader, updateCustomShader } = useVJStore();

  // Create new shader
  const createShader = () => {
    addCustomShader({
      id: `shader-${Date.now()}`,
      name: 'My Shader',
      fragmentShader: '...',
      uniforms: {},
    });
  };

  // Update existing shader
  const updateShader = (id: string) => {
    updateCustomShader(id, {
      name: 'Updated Name',
      // ... other updates
    });
  };

  // List all shaders
  return (
    <div>
      {customShaders.map(shader => (
        <div key={shader.id}>{shader.name}</div>
      ))}
    </div>
  );
}
```

### Exporting Shader Presets

Export shaders as JSON files for sharing:

```tsx
// In ShaderEditor component, click "Export" button
// Downloads a JSON file with shader definition

// Import shader preset:
import shaderPreset from './my-shader.json';
addCustomShader(shaderPreset);
```

## Integration with VJ Store

Both features integrate seamlessly with the global store:

```tsx
import { useVJStore } from './store';

function MyVJApp() {
  const {
    // Recording state
    recordingState,
    setRecordingState,

    // Custom shaders
    customShaders,
    addCustomShader,
    updateCustomShader,
    removeCustomShader,
  } = useVJStore();

  // Recording state is automatically managed by useRecorder hook
  // Custom shaders are automatically saved when using ShaderEditor
}
```

## Supported Formats

### Recording Formats

The recorder automatically detects and uses the best available codec:

- VP9 (preferred for high quality)
- VP8 (fallback)
- H.264 (Safari/legacy)

All recordings are saved as `.webm` files.

### Shader Language

Shaders are written in GLSL ES 1.0 (WebGL 1.0):

- Fragment shader: Main shader code
- Vertex shader: Optional (default provided)
- Precision qualifiers required
- `texture2D()` for texture sampling

## Performance Tips

### Recording

- Use 30fps for longer recordings to reduce file size
- Lower quality settings for real-time streaming
- Disable audio if not needed
- Stop/download recordings periodically for very long sessions

### Shaders

- Minimize texture lookups in loops
- Use `lowp`/`mediump` precision when possible
- Cache expensive calculations
- Test performance with preview before applying to main canvas
- Limit uniform updates to when values actually change

## Browser Support

### Recording
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Limited (H.264 only, no VP9)

### Shader Editor
- All modern browsers with WebGL 1.0 support
- Monaco Editor requires modern ES6+ support
