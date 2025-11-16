/**
 * Transition Implementations
 *
 * Export all transition types and their implementations
 */

export * from './crossfade';
export * from './wipe';
export * from './zoom';
export * from './rotate';
export * from './glitch';
export * from './pixelate';

import type { TransitionType } from '../../types';

// Import shader codes
import { crossfadeShaderCode } from './crossfade';
import { getWipeShaderCode, type WipeDirection } from './wipe';
import { zoomShaderCode } from './zoom';
import { rotateShaderCode } from './rotate';
import { glitchShaderCode } from './glitch';
import { pixelateShaderCode } from './pixelate';

/**
 * Get shader code for a given transition type
 */
export const getTransitionShaderCode = (
  transitionType: TransitionType,
  _direction?: WipeDirection
): string => {
  switch (transitionType) {
    case 'crossfade':
      return crossfadeShaderCode;

    case 'wipe-horizontal':
      return getWipeShaderCode('horizontal');

    case 'wipe-vertical':
      return getWipeShaderCode('vertical');

    case 'wipe-diagonal':
      return getWipeShaderCode('diagonal');

    case 'wipe-circular':
      return getWipeShaderCode('circular');

    case 'zoom-in':
    case 'zoom-out':
      return zoomShaderCode;

    case 'rotate':
      return rotateShaderCode;

    case 'glitch':
      return glitchShaderCode;

    case 'pixelate':
      return pixelateShaderCode;

    case 'none':
    default:
      return crossfadeShaderCode;
  }
};

/**
 * Check if a transition requires WebGL shaders
 */
export const transitionRequiresShader = (transitionType: TransitionType): boolean => {
  // All transitions except 'none' and basic 'crossfade' benefit from shaders
  return transitionType !== 'none';
};

/**
 * Get default parameters for a transition type
 */
export const getDefaultTransitionParams = (
  transitionType: TransitionType
): Record<string, number> => {
  switch (transitionType) {
    case 'wipe-horizontal':
    case 'wipe-vertical':
    case 'wipe-diagonal':
    case 'wipe-circular':
      return { feather: 0.1, angle: 45 };

    case 'zoom-in':
      return { intensity: 1.5, centerX: 0.5, centerY: 0.5, blur: 0.3 };

    case 'zoom-out':
      return { intensity: 1.5, centerX: 0.5, centerY: 0.5, blur: 0.3 };

    case 'rotate':
      return { angle: 360, scale: 0.8, blur: 0.2 };

    case 'glitch':
      return {
        intensity: 0.8,
        blockSize: 0.05,
        rgbShift: 0.03,
        displacement: 0.1,
        noiseAmount: 0.3,
      };

    case 'pixelate':
      return { maxPixelSize: 20 };

    case 'crossfade':
    case 'none':
    default:
      return {};
  }
};
