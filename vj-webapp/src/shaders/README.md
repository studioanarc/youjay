# VJ Webapp Shader System

A comprehensive real-time shader system for video effects and layer compositing, optimized for 60fps performance.

## Overview

The shader system consists of:

- **Blend Modes**: 11 compositing modes for layer blending
- **Effects**: 17 real-time video effects
- **ShaderMaterial**: Helper utilities for Three.js shader management
- **EffectComposer**: Effect chaining and render pipeline
- **LayerCompositor**: Multi-layer blend mode compositing

## File Structure

```
src/shaders/
├── blendModes.glsl.ts       # All blend mode shaders
├── ShaderMaterial.ts         # Material creation utilities
├── EffectComposer.ts         # Effect chaining system
├── index.ts                  # Main exports
└── effects/
    ├── blur.glsl.ts          # Gaussian blur
    ├── brightness.glsl.ts    # Brightness adjustment
    ├── contrast.glsl.ts      # Contrast adjustment
    ├── saturation.glsl.ts    # Color saturation
    ├── hue.glsl.ts           # Hue rotation
    ├── pixelate.glsl.ts      # Pixelation/mosaic
    ├── kaleidoscope.glsl.ts  # Kaleidoscope/mandala
    ├── mirror.glsl.ts        # Mirror effect
    ├── edgeDetect.glsl.ts    # Sobel edge detection
    ├── posterize.glsl.ts     # Color quantization
    ├── glitch.glsl.ts        # Digital glitch/datamosh
    ├── chromakey.glsl.ts     # Green screen removal
    ├── feedback.glsl.ts      # Video feedback delay
    ├── rgbShift.glsl.ts      # Chromatic aberration
    ├── vhs.glsl.ts           # VHS tape effect
    ├── crt.glsl.ts           # CRT monitor simulation
    └── bloom.glsl.ts         # Bloom/glow effect
```

## Blend Modes

All blend modes support two textures and opacity control:

- **normal**: Standard alpha compositing
- **multiply**: Darkens by multiplying colors
- **screen**: Lightens by inverting multiply
- **overlay**: Combination of multiply and screen
- **add**: Additive blending (linear dodge)
- **subtract**: Subtractive blending
- **difference**: Absolute difference
- **lighten**: Maximum of each channel
- **darken**: Minimum of each channel
- **color-dodge**: Brightens based on blend color
- **color-burn**: Darkens based on blend color

### Usage Example

```typescript
import { LayerCompositor } from './shaders';

const compositor = new LayerCompositor(renderer, 1920, 1080);

// Blend two video layers
const result = compositor.composite(
  baseLayerTexture,
  topLayerTexture,
  'screen',  // blend mode
  0.8        // opacity
);
```

## Effects

All effects are optimized for real-time performance and export:
- `vertexShader`: Standard pass-through vertex shader
- `fragmentShader`: Effect-specific fragment shader
- `defaultUniforms`: Default parameter values

### Effect Parameters

#### Blur
- `amount`: 0.0-1.0 (blur intensity)

#### Brightness
- `amount`: -1.0 to 1.0 (0.0 = no change)

#### Contrast
- `amount`: 0.0 to 2.0 (1.0 = no change)

#### Saturation
- `amount`: 0.0 to 2.0 (1.0 = no change, 0.0 = grayscale)

#### Hue
- `amount`: 0.0 to 1.0 (normalized hue rotation)

#### Pixelate
- `amount`: 1.0-100.0 (pixel size)

#### Kaleidoscope
- `segments`: 2.0-16.0 (number of segments)
- `angle`: rotation angle in radians

#### Mirror
- `horizontal`: 0.0 or 1.0
- `vertical`: 0.0 or 1.0

#### Edge Detect
- `amount`: 0.0-1.0 (edge visibility)

#### Posterize
- `levels`: 2.0-256.0 (color levels)

#### Glitch
- `amount`: 0.0-1.0 (glitch intensity)
- `speed`: animation speed multiplier
- `time`: auto-updated by composer

#### Chromakey
- `keyColor`: [r, g, b] color to remove
- `threshold`: 0.0-1.0 (color similarity)
- `smoothness`: 0.0-1.0 (edge softness)

#### Feedback
- `amount`: 0.0-1.0 (feedback mix)
- `scale`: scale factor for feedback
- `offset`: [x, y] position offset
- `tFeedback`: previous frame texture

#### RGB Shift
- `amount`: 0.0-1.0 (shift distance)
- `angle`: shift direction in radians

#### VHS
- `amount`: 0.0-1.0 (effect intensity)
- `time`: auto-updated by composer

#### CRT
- `amount`: 0.0-1.0 (effect intensity)
- `curvature`: screen curvature amount
- `time`: auto-updated by composer

#### Bloom
Two-pass effect:
- **Extract Pass**: `threshold`, `intensity`
- **Composite Pass**: `amount` (bloom mix)

### Usage Example

```typescript
import { EffectComposer } from './shaders';
import { Effect } from '../types';

// Create composer
const composer = new EffectComposer(renderer, 1920, 1080);

// Add effects
const effects: Effect[] = [
  {
    id: 'brightness-1',
    type: 'brightness',
    enabled: true,
    parameters: { amount: 0.2 }
  },
  {
    id: 'blur-1',
    type: 'blur',
    enabled: true,
    parameters: { amount: 0.3 }
  },
  {
    id: 'vhs-1',
    type: 'vhs',
    enabled: true,
    parameters: { amount: 0.5 }
  }
];

// Add all effects
for (const effect of effects) {
  await composer.addEffect(effect);
}

// Render loop
function animate() {
  const deltaTime = clock.getDelta();

  // Render with effects
  composer.render(videoTexture, outputTarget, deltaTime);

  requestAnimationFrame(animate);
}
```

## ShaderMaterial Utilities

Helper functions for working with Three.js shader materials:

```typescript
import {
  createShaderMaterial,
  createEffectMaterial,
  updateUniforms,
  createRenderTarget,
  loadEffectShader
} from './shaders';

// Load a shader dynamically
const blurShader = await loadEffectShader('blur');

// Create material
const material = createEffectMaterial(blurShader, {
  amount: 0.5
});

// Update uniforms
updateUniforms(material, {
  amount: 0.8,
  time: performance.now() / 1000
});

// Create render target
const target = createRenderTarget(1920, 1080);
```

## Performance Optimization

### 60fps Guidelines

1. **Minimize texture samples**: Most effects use 1-9 texture samples
2. **Use ping-pong buffers**: EffectComposer manages this automatically
3. **Disable unused effects**: Only enabled effects are rendered
4. **Appropriate resolutions**: Use lower resolution for expensive effects
5. **Effect order matters**: Place cheaper effects first

### Expensive Effects (use sparingly)
- Blur (9-tap Gaussian)
- Bloom (requires multiple passes)
- Feedback (requires extra render target)
- Edge Detect (9 samples)

### Cheap Effects (safe for multiple instances)
- Brightness, Contrast, Saturation
- Hue rotation
- RGB Shift
- Posterize

### Optimization Tips

```typescript
// Good: Reuse composer instance
const composer = new EffectComposer(renderer, width, height);

// Good: Update parameters instead of recreating
composer.updateEffect('blur-1', { amount: newValue });

// Good: Disable instead of removing
composer.setEffectEnabled('blur-1', false);

// Bad: Creating new composer every frame
// DON'T DO THIS
const composer = new EffectComposer(renderer, width, height);
```

## Advanced Usage

### Custom Effect Chaining

```typescript
const composer = new EffectComposer(renderer, 1920, 1080);

// Color grading chain
await composer.addEffect({
  id: 'brightness',
  type: 'brightness',
  enabled: true,
  parameters: { amount: 0.1 }
});

await composer.addEffect({
  id: 'contrast',
  type: 'contrast',
  enabled: true,
  parameters: { amount: 1.2 }
});

await composer.addEffect({
  id: 'saturation',
  type: 'saturation',
  enabled: true,
  parameters: { amount: 1.3 }
});
```

### Multi-Layer Compositing

```typescript
const compositor = new LayerCompositor(renderer, 1920, 1080);

// Composite multiple layers
let result = baseTexture;

for (const layer of layers) {
  if (layer.visible && layer.videoTexture) {
    result = compositor.composite(
      result,
      layer.videoTexture,
      layer.blendMode,
      layer.opacity
    );
  }
}
```

### Video Feedback Loop

```typescript
// Create feedback texture storage
const feedbackTarget = createRenderTarget(1920, 1080);
let previousFrame = null;

function render() {
  // Apply feedback effect
  const feedbackEffect = {
    id: 'feedback',
    type: 'feedback',
    enabled: true,
    parameters: {
      amount: 0.7,
      scale: 1.02,
      offset: [0.001, 0.001]
    }
  };

  // Update feedback texture
  if (previousFrame) {
    updateUniforms(material, {
      tFeedback: previousFrame.texture
    });
  }

  // Render and store for next frame
  composer.render(input, feedbackTarget, deltaTime);
  previousFrame = feedbackTarget;
}
```

## Integration with VJ Engine

The shader system integrates with the VJ engine through:

1. **VideoLayer.effects**: Array of Effect objects
2. **VideoLayer.blendMode**: Blend mode for layer compositing
3. **Effect.parameters**: Dynamic parameter control
4. **Real-time updates**: Parameters can be modified during playback

## MIDI/Audio Integration

Effects can be controlled via MIDI or audio reactivity:

```typescript
// MIDI control example
function onMIDICC(cc: number, value: number) {
  if (cc === 1) { // Modulation wheel
    const amount = value / 127;
    composer.updateEffect('blur-1', { amount });
  }
}

// Audio reactivity example
function onAudioLevel(level: number) {
  const glitchAmount = Math.min(level * 2, 1.0);
  composer.updateEffect('glitch-1', { amount: glitchAmount });
}
```

## Browser Compatibility

Requires WebGL 1.0 support (all modern browsers):
- Chrome 56+
- Firefox 51+
- Safari 11+
- Edge 79+

All shaders use GLSL ES 1.00 for maximum compatibility.

## Troubleshooting

### Performance Issues
- Reduce resolution of render targets
- Disable expensive effects
- Limit number of active effects to 3-5
- Check GPU usage in browser DevTools

### Visual Artifacts
- Ensure correct texture wrap modes
- Verify uniform value ranges
- Check for NaN/Infinity in parameters
- Validate render target formats

### Memory Leaks
- Always call `composer.dispose()` when done
- Use `clearEffects()` before adding new effects
- Properly dispose of unused render targets

## Future Enhancements

Potential additions:
- Custom GLSL shader support
- Effect presets/templates
- GPU particle effects
- 3D displacement mapping
- Fluid simulation
- Ray marching effects
