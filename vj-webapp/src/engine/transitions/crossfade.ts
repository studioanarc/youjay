/**
 * Crossfade Transition
 *
 * Smoothly fades between two states by interpolating opacity
 */

import { clamp } from '../../utils/easing';

export interface CrossfadeParams {
  // No additional parameters needed for basic crossfade
}

/**
 * Apply crossfade transition
 * @param progress - Transition progress (0-1)
 * @param params - Transition parameters
 * @returns Object with opacity values for source and target
 */
export const applyCrossfade = (
  progress: number,
  _params: CrossfadeParams = {}
): {
  sourceOpacity: number;
  targetOpacity: number;
} => {
  const p = clamp(progress, 0, 1);

  return {
    sourceOpacity: 1 - p,
    targetOpacity: p,
  };
};

/**
 * Generate crossfade shader uniforms for WebGL rendering
 */
export const getCrossfadeUniforms = (
  progress: number,
  params: CrossfadeParams = {}
): Record<string, number> => {
  const { sourceOpacity, targetOpacity } = applyCrossfade(progress, params);

  return {
    u_sourceOpacity: sourceOpacity,
    u_targetOpacity: targetOpacity,
    u_progress: clamp(progress, 0, 1),
  };
};

/**
 * Crossfade fragment shader code
 */
export const crossfadeShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;

  varying vec2 v_texCoord;

  void main() {
    vec4 sourceColor = texture2D(u_sourceTexture, v_texCoord);
    vec4 targetColor = texture2D(u_targetTexture, v_texCoord);

    // Simple linear interpolation
    gl_FragColor = mix(sourceColor, targetColor, u_progress);
  }
`;
