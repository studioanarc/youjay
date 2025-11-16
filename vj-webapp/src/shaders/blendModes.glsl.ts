/**
 * Blend Mode Shaders for VJ Webapp
 *
 * GLSL fragment shaders for compositing two textures with various blend modes.
 * Optimized for real-time performance at 60fps.
 */

import type { BlendMode } from '../types';

// Common vertex shader for all blend modes
export const blendVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Normal blend mode (alpha compositing)
export const normalBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    // Simple alpha compositing
    float alpha = blend.a * opacity;
    vec3 color = mix(base.rgb, blend.rgb, alpha);

    gl_FragColor = vec4(color, max(base.a, alpha));
  }
`;

// Multiply blend mode
export const multiplyBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = base.rgb * blend.rgb;
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Screen blend mode
export const screenBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = 1.0 - (1.0 - base.rgb) * (1.0 - blend.rgb);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Overlay blend mode
export const overlayBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  vec3 overlayComponent(vec3 base, vec3 blend) {
    return mix(
      2.0 * base * blend,
      1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
      step(0.5, base)
    );
  }

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = overlayComponent(base.rgb, blend.rgb);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Add (Linear Dodge) blend mode
export const addBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = min(base.rgb + blend.rgb, 1.0);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Subtract blend mode
export const subtractBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = max(base.rgb - blend.rgb, 0.0);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Difference blend mode
export const differenceBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = abs(base.rgb - blend.rgb);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Lighten (Max) blend mode
export const lightenBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = max(base.rgb, blend.rgb);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Darken (Min) blend mode
export const darkenBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = min(base.rgb, blend.rgb);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Color Dodge blend mode
export const colorDodgeBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  vec3 colorDodge(vec3 base, vec3 blend) {
    return mix(
      base / (1.0 - blend),
      vec3(1.0),
      step(0.999, blend)
    );
  }

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = min(colorDodge(base.rgb, blend.rgb), 1.0);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Color Burn blend mode
export const colorBurnBlend = `
  uniform sampler2D baseTexture;
  uniform sampler2D blendTexture;
  uniform float opacity;
  varying vec2 vUv;

  vec3 colorBurn(vec3 base, vec3 blend) {
    return mix(
      1.0 - (1.0 - base) / blend,
      vec3(0.0),
      step(blend, vec3(0.001))
    );
  }

  void main() {
    vec4 base = texture2D(baseTexture, vUv);
    vec4 blend = texture2D(blendTexture, vUv);

    vec3 color = max(colorBurn(base.rgb, blend.rgb), 0.0);
    color = mix(base.rgb, color, opacity * blend.a);

    gl_FragColor = vec4(color, max(base.a, blend.a * opacity));
  }
`;

// Map blend modes to their fragment shaders
export const blendModeShaders: Record<BlendMode, string> = {
  'normal': normalBlend,
  'multiply': multiplyBlend,
  'screen': screenBlend,
  'overlay': overlayBlend,
  'add': addBlend,
  'subtract': subtractBlend,
  'difference': differenceBlend,
  'lighten': lightenBlend,
  'darken': darkenBlend,
  'color-dodge': colorDodgeBlend,
  'color-burn': colorBurnBlend,
};

// Get shader for a specific blend mode
export function getBlendModeShader(mode: BlendMode): string {
  return blendModeShaders[mode] || normalBlend;
}
