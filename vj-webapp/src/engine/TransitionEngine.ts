/**
 * Transition Engine
 *
 * Core engine for managing and executing transitions between video layers and scenes
 */

import type { Transition, TransitionType, EasingFunction } from '../types';
import { getEasingFunction } from '../utils/easing';
import {
  applyCrossfade,
  getCrossfadeUniforms,
} from './transitions/crossfade';
import {
  getWipeUniforms,
  type WipeDirection,
} from './transitions/wipe';
import {
  applyZoom,
  getZoomUniforms,
  type ZoomDirection,
} from './transitions/zoom';
import {
  applyRotate,
  getRotateUniforms,
} from './transitions/rotate';
import {
  getGlitchUniforms,
} from './transitions/glitch';
import {
  getPixelateUniforms,
} from './transitions/pixelate';
import {
  getTransitionShaderCode,
  getDefaultTransitionParams,
} from './transitions';

/**
 * Transition state
 */
export interface TransitionState {
  isActive: boolean;
  startTime: number;
  duration: number;
  progress: number; // 0-1
  easedProgress: number; // 0-1, after easing applied
  type: TransitionType;
  easing: EasingFunction;
  parameters: Record<string, number>;
  onComplete?: () => void;
}

/**
 * Transition result containing all computed values
 */
export interface TransitionResult {
  progress: number;
  easedProgress: number;
  opacity: number;
  uniforms: Record<string, number>;
  shaderCode?: string;
  isComplete: boolean;
}

/**
 * TransitionEngine class
 * Manages transition lifecycle and calculations
 */
export class TransitionEngine {
  private state: TransitionState | null = null;
  private animationFrameId: number | null = null;
  private onUpdateCallback?: (result: TransitionResult) => void;

  /**
   * Start a new transition
   */
  start(
    transition: Transition,
    onUpdate?: (result: TransitionResult) => void,
    onComplete?: () => void
  ): void {
    // Stop any existing transition
    this.stop();

    // Merge default parameters with user parameters
    const defaultParams = getDefaultTransitionParams(transition.type);
    const parameters = { ...defaultParams, ...transition.parameters };

    // Initialize state
    this.state = {
      isActive: true,
      startTime: performance.now(),
      duration: transition.duration,
      progress: 0,
      easedProgress: 0,
      type: transition.type,
      easing: transition.easing,
      parameters,
      onComplete,
    };

    this.onUpdateCallback = onUpdate;

    // Start animation loop
    this.animate();
  }

  /**
   * Stop current transition
   */
  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.state = null;
    this.onUpdateCallback = undefined;
  }

  /**
   * Pause current transition
   */
  pause(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resume paused transition
   */
  resume(): void {
    if (this.state && !this.animationFrameId) {
      // Adjust start time to account for pause
      const elapsed = this.state.progress * this.state.duration;
      this.state.startTime = performance.now() - elapsed;
      this.animate();
    }
  }

  /**
   * Get current transition state
   */
  getState(): TransitionState | null {
    return this.state;
  }

  /**
   * Check if transition is active
   */
  isActive(): boolean {
    return this.state?.isActive ?? false;
  }

  /**
   * Get current progress (0-1)
   */
  getProgress(): number {
    return this.state?.progress ?? 0;
  }

  /**
   * Get eased progress (0-1)
   */
  getEasedProgress(): number {
    return this.state?.easedProgress ?? 0;
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.state) return;

    const now = performance.now();
    const elapsed = now - this.state.startTime;
    const rawProgress = Math.min(elapsed / this.state.duration, 1);

    // Apply easing function
    const easingFn = getEasingFunction(this.state.easing);
    const easedProgress = easingFn(rawProgress);

    // Update state
    this.state.progress = rawProgress;
    this.state.easedProgress = easedProgress;

    // Calculate transition result
    const result = this.calculateTransition(easedProgress);

    // Call update callback
    if (this.onUpdateCallback) {
      this.onUpdateCallback(result);
    }

    // Check if complete
    if (rawProgress >= 1) {
      this.complete();
    } else {
      // Continue animation
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  };

  /**
   * Calculate transition values for current progress
   */
  private calculateTransition(progress: number): TransitionResult {
    if (!this.state) {
      return {
        progress: 0,
        easedProgress: 0,
        opacity: 1,
        uniforms: {},
        isComplete: true,
      };
    }

    const { type, parameters } = this.state;

    let uniforms: Record<string, number> = {};
    let opacity = 1;
    let shaderCode: string | undefined;

    // Calculate type-specific values
    switch (type) {
      case 'crossfade': {
        const result = applyCrossfade(progress, parameters);
        uniforms = getCrossfadeUniforms(progress, parameters);
        opacity = result.targetOpacity;
        shaderCode = getTransitionShaderCode(type);
        break;
      }

      case 'wipe-horizontal':
      case 'wipe-vertical':
      case 'wipe-diagonal':
      case 'wipe-circular': {
        const direction = this.getWipeDirection(type);
        uniforms = getWipeUniforms(progress, { ...parameters, direction });
        shaderCode = getTransitionShaderCode(type);
        break;
      }

      case 'zoom-in':
      case 'zoom-out': {
        const direction: ZoomDirection = type === 'zoom-in' ? 'in' : 'out';
        const result = applyZoom(progress, { ...parameters, direction });
        uniforms = getZoomUniforms(progress, { ...parameters, direction });
        opacity = result.opacity;
        shaderCode = getTransitionShaderCode(type);
        break;
      }

      case 'rotate': {
        const result = applyRotate(progress, parameters);
        uniforms = getRotateUniforms(progress, parameters);
        opacity = result.opacity;
        shaderCode = getTransitionShaderCode(type);
        break;
      }

      case 'glitch': {
        uniforms = getGlitchUniforms(progress, parameters);
        shaderCode = getTransitionShaderCode(type);
        break;
      }

      case 'pixelate': {
        uniforms = getPixelateUniforms(progress, parameters);
        shaderCode = getTransitionShaderCode(type);
        break;
      }

      case 'none':
      default: {
        opacity = 1;
        uniforms = { u_progress: progress };
        break;
      }
    }

    return {
      progress: this.state.progress,
      easedProgress: this.state.easedProgress,
      opacity,
      uniforms,
      shaderCode,
      isComplete: false,
    };
  }

  /**
   * Helper to get wipe direction from transition type
   */
  private getWipeDirection(type: TransitionType): WipeDirection {
    switch (type) {
      case 'wipe-horizontal':
        return 'horizontal';
      case 'wipe-vertical':
        return 'vertical';
      case 'wipe-diagonal':
        return 'diagonal';
      case 'wipe-circular':
        return 'circular';
      default:
        return 'horizontal';
    }
  }

  /**
   * Complete the transition
   */
  private complete(): void {
    const onComplete = this.state?.onComplete;

    // Clean up
    this.stop();

    // Call completion callback
    if (onComplete) {
      onComplete();
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stop();
    this.onUpdateCallback = undefined;
  }
}

/**
 * Create a singleton instance
 */
let engineInstance: TransitionEngine | null = null;

/**
 * Get or create the global transition engine instance
 */
export const getTransitionEngine = (): TransitionEngine => {
  if (!engineInstance) {
    engineInstance = new TransitionEngine();
  }
  return engineInstance;
};

/**
 * Destroy the global transition engine instance
 */
export const destroyTransitionEngine = (): void => {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
};
