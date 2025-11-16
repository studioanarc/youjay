/**
 * Wipe Transitions
 *
 * Various directional wipe effects (horizontal, vertical, diagonal, circular)
 */

import { clamp } from '../../utils/easing';

export type WipeDirection = 'horizontal' | 'vertical' | 'diagonal' | 'circular';

export interface WipeParams {
  direction?: WipeDirection;
  angle?: number; // For diagonal wipes (in degrees)
  feather?: number; // Edge softness (0-1)
  reverse?: boolean; // Reverse the wipe direction
}

/**
 * Apply wipe transition
 */
export const applyWipe = (
  progress: number,
  params: WipeParams = {}
): {
  progress: number;
  direction: WipeDirection;
  angle: number;
  feather: number;
  reverse: boolean;
} => {
  const {
    direction = 'horizontal',
    angle = 45,
    feather = 0.1,
    reverse = false,
  } = params;

  const p = clamp(progress, 0, 1);

  return {
    progress: reverse ? 1 - p : p,
    direction,
    angle,
    feather: clamp(feather, 0, 1),
    reverse,
  };
};

/**
 * Generate wipe shader uniforms
 */
export const getWipeUniforms = (
  progress: number,
  params: WipeParams = {}
): Record<string, number> => {
  const wipeData = applyWipe(progress, params);
  const angleRad = (wipeData.angle * Math.PI) / 180;

  return {
    u_progress: wipeData.progress,
    u_feather: wipeData.feather,
    u_angle: angleRad,
    u_direction: getDirectionValue(wipeData.direction),
  };
};

/**
 * Convert direction to numeric value for shader
 */
const getDirectionValue = (direction: WipeDirection): number => {
  const directions: Record<WipeDirection, number> = {
    horizontal: 0,
    vertical: 1,
    diagonal: 2,
    circular: 3,
  };
  return directions[direction];
};

/**
 * Horizontal wipe shader code
 */
export const wipeHorizontalShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_feather;

  varying vec2 v_texCoord;

  void main() {
    vec4 sourceColor = texture2D(u_sourceTexture, v_texCoord);
    vec4 targetColor = texture2D(u_targetTexture, v_texCoord);

    float edge = u_progress;
    float featherHalf = u_feather * 0.5;

    // Create smooth transition edge
    float mask = smoothstep(edge - featherHalf, edge + featherHalf, v_texCoord.x);

    gl_FragColor = mix(sourceColor, targetColor, mask);
  }
`;

/**
 * Vertical wipe shader code
 */
export const wipeVerticalShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_feather;

  varying vec2 v_texCoord;

  void main() {
    vec4 sourceColor = texture2D(u_sourceTexture, v_texCoord);
    vec4 targetColor = texture2D(u_targetTexture, v_texCoord);

    float edge = u_progress;
    float featherHalf = u_feather * 0.5;

    // Create smooth transition edge
    float mask = smoothstep(edge - featherHalf, edge + featherHalf, v_texCoord.y);

    gl_FragColor = mix(sourceColor, targetColor, mask);
  }
`;

/**
 * Diagonal wipe shader code
 */
export const wipeDiagonalShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_feather;
  uniform float u_angle;

  varying vec2 v_texCoord;

  void main() {
    vec4 sourceColor = texture2D(u_sourceTexture, v_texCoord);
    vec4 targetColor = texture2D(u_targetTexture, v_texCoord);

    // Calculate diagonal position
    vec2 centered = v_texCoord - 0.5;
    float diagonal = dot(centered, vec2(cos(u_angle), sin(u_angle))) + 0.5;

    float edge = u_progress;
    float featherHalf = u_feather * 0.5;

    // Create smooth transition edge
    float mask = smoothstep(edge - featherHalf, edge + featherHalf, diagonal);

    gl_FragColor = mix(sourceColor, targetColor, mask);
  }
`;

/**
 * Circular wipe shader code
 */
export const wipeCircularShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_feather;

  varying vec2 v_texCoord;

  void main() {
    vec4 sourceColor = texture2D(u_sourceTexture, v_texCoord);
    vec4 targetColor = texture2D(u_targetTexture, v_texCoord);

    // Calculate distance from center
    vec2 centered = v_texCoord - 0.5;
    float dist = length(centered) * 2.0; // Normalize to 0-1 range

    float edge = u_progress;
    float featherHalf = u_feather * 0.5;

    // Create smooth circular transition
    float mask = smoothstep(edge - featherHalf, edge + featherHalf, dist);

    gl_FragColor = mix(targetColor, sourceColor, mask);
  }
`;

/**
 * Get appropriate shader code based on direction
 */
export const getWipeShaderCode = (direction: WipeDirection): string => {
  switch (direction) {
    case 'horizontal':
      return wipeHorizontalShaderCode;
    case 'vertical':
      return wipeVerticalShaderCode;
    case 'diagonal':
      return wipeDiagonalShaderCode;
    case 'circular':
      return wipeCircularShaderCode;
    default:
      return wipeHorizontalShaderCode;
  }
};
