/**
 * Pixelate Transition
 *
 * Pixelation effect that increases then decreases
 */

import { clamp } from '../../utils/easing';

export interface PixelateParams {
  maxPixelSize?: number; // Maximum pixel size (in pixels, default: 20)
  curve?: 'linear' | 'parabolic' | 'step'; // How pixelation changes over time
}

/**
 * Apply pixelate transition
 */
export const applyPixelate = (
  progress: number,
  params: PixelateParams = {}
): {
  progress: number;
  pixelSize: number;
  opacity: number;
} => {
  const {
    maxPixelSize = 20,
    curve = 'parabolic',
  } = params;

  const p = clamp(progress, 0, 1);

  // Calculate pixel size based on curve
  let pixelSizeFactor: number;

  switch (curve) {
    case 'linear':
      // Linear increase then decrease
      pixelSizeFactor = p < 0.5 ? p * 2 : (1 - p) * 2;
      break;

    case 'parabolic':
      // Smooth parabolic curve (peaks at middle)
      pixelSizeFactor = 1 - Math.pow(2 * p - 1, 2);
      break;

    case 'step':
      // Step function (instant pixelation, then instant unpixelation)
      pixelSizeFactor = p < 0.5 ? 1 : 0;
      break;

    default:
      pixelSizeFactor = 1 - Math.pow(2 * p - 1, 2);
  }

  const pixelSize = 1 + pixelSizeFactor * (maxPixelSize - 1);

  return {
    progress: p,
    pixelSize,
    opacity: 1,
  };
};

/**
 * Generate pixelate shader uniforms
 */
export const getPixelateUniforms = (
  progress: number,
  params: PixelateParams = {}
): Record<string, number> => {
  const pixelateData = applyPixelate(progress, params);

  return {
    u_progress: pixelateData.progress,
    u_pixelSize: pixelateData.pixelSize,
  };
};

/**
 * Pixelate transition shader code
 */
export const pixelateShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_pixelSize;
  uniform vec2 u_resolution;

  varying vec2 v_texCoord;

  vec4 pixelate(sampler2D tex, vec2 uv, float size) {
    if (size <= 1.0) {
      return texture2D(tex, uv);
    }

    // Calculate pixel size in UV space
    vec2 pixelUVSize = size / u_resolution;

    // Snap to pixel grid
    vec2 pixelatedUV = floor(uv / pixelUVSize) * pixelUVSize + pixelUVSize * 0.5;

    return texture2D(tex, pixelatedUV);
  }

  void main() {
    // Sample both textures with pixelation
    vec4 sourceColor = pixelate(u_sourceTexture, v_texCoord, u_pixelSize);
    vec4 targetColor = pixelate(u_targetTexture, v_texCoord, u_pixelSize);

    // Crossfade between source and target
    gl_FragColor = mix(sourceColor, targetColor, u_progress);
  }
`;

/**
 * Alternative: Mosaic pixelate with color quantization
 */
export const pixelateMosaicShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_pixelSize;
  uniform vec2 u_resolution;

  varying vec2 v_texCoord;

  vec4 quantizeColor(vec4 color, float levels) {
    return floor(color * levels) / levels;
  }

  vec4 pixelateMosaic(sampler2D tex, vec2 uv, float size) {
    if (size <= 1.0) {
      return texture2D(tex, uv);
    }

    // Calculate pixel size in UV space
    vec2 pixelUVSize = size / u_resolution;

    // Snap to pixel grid
    vec2 pixelatedUV = floor(uv / pixelUVSize) * pixelUVSize + pixelUVSize * 0.5;

    // Sample and quantize color
    vec4 color = texture2D(tex, pixelatedUV);

    // Reduce color depth based on pixel size
    float colorLevels = max(3.0, 16.0 - u_pixelSize * 0.5);
    return quantizeColor(color, colorLevels);
  }

  void main() {
    // Sample both textures with mosaic pixelation
    vec4 sourceColor = pixelateMosaic(u_sourceTexture, v_texCoord, u_pixelSize);
    vec4 targetColor = pixelateMosaic(u_targetTexture, v_texCoord, u_pixelSize);

    // Crossfade between source and target
    gl_FragColor = mix(sourceColor, targetColor, u_progress);
  }
`;
