/**
 * useTransition Hook
 *
 * React hook for managing transitions in components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Transition } from '../types';
import {
  TransitionEngine,
  type TransitionState,
  type TransitionResult,
} from '../engine/TransitionEngine';

/**
 * Transition hook options
 */
export interface UseTransitionOptions {
  autoStart?: boolean; // Auto-start transition on mount
  loop?: boolean; // Loop the transition
  onStart?: () => void;
  onUpdate?: (result: TransitionResult) => void;
  onComplete?: () => void;
}

/**
 * Transition hook return value
 */
export interface UseTransitionReturn {
  // State
  isActive: boolean;
  progress: number;
  easedProgress: number;
  result: TransitionResult | null;

  // Controls
  start: (transition?: Partial<Transition>) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;

  // Utilities
  setTransition: (transition: Partial<Transition>) => void;
  getState: () => TransitionState | null;
}

/**
 * Default transition configuration
 */
const DEFAULT_TRANSITION: Transition = {
  type: 'crossfade',
  duration: 1000,
  easing: 'ease-in-out',
  parameters: {},
};

/**
 * useTransition Hook
 *
 * @param initialTransition - Initial transition configuration
 * @param options - Hook options
 * @returns Transition controls and state
 */
export const useTransition = (
  initialTransition: Partial<Transition> = {},
  options: UseTransitionOptions = {}
): UseTransitionReturn => {
  const {
    autoStart = false,
    loop = false,
    onStart,
    onUpdate,
    onComplete,
  } = options;

  // Engine instance ref
  const engineRef = useRef<TransitionEngine | null>(null);

  // Transition configuration state
  const [transition, setTransitionConfig] = useState<Transition>({
    ...DEFAULT_TRANSITION,
    ...initialTransition,
  });

  // Transition state
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [easedProgress, setEasedProgress] = useState(0);
  const [result, setResult] = useState<TransitionResult | null>(null);

  // Initialize engine
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new TransitionEngine();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  /**
   * Handle transition update
   */
  const handleUpdate = useCallback(
    (transitionResult: TransitionResult) => {
      setProgress(transitionResult.progress);
      setEasedProgress(transitionResult.easedProgress);
      setResult(transitionResult);

      if (onUpdate) {
        onUpdate(transitionResult);
      }
    },
    [onUpdate]
  );

  /**
   * Handle transition complete
   */
  const handleComplete = useCallback(() => {
    setIsActive(false);

    if (onComplete) {
      onComplete();
    }

    // Loop if enabled
    if (loop && engineRef.current) {
      setTimeout(() => {
        start();
      }, 100);
    }
  }, [loop, onComplete]);

  /**
   * Start transition
   */
  const start = useCallback(
    (newTransition?: Partial<Transition>) => {
      if (!engineRef.current) return;

      // Update transition config if provided
      const transitionToUse = newTransition
        ? { ...transition, ...newTransition }
        : transition;

      setTransitionConfig(transitionToUse);
      setIsActive(true);

      if (onStart) {
        onStart();
      }

      engineRef.current.start(transitionToUse, handleUpdate, handleComplete);
    },
    [transition, handleUpdate, handleComplete, onStart]
  );

  /**
   * Stop transition
   */
  const stop = useCallback(() => {
    if (!engineRef.current) return;

    engineRef.current.stop();
    setIsActive(false);
    setProgress(0);
    setEasedProgress(0);
    setResult(null);
  }, []);

  /**
   * Pause transition
   */
  const pause = useCallback(() => {
    if (!engineRef.current) return;

    engineRef.current.pause();
    setIsActive(false);
  }, []);

  /**
   * Resume transition
   */
  const resume = useCallback(() => {
    if (!engineRef.current) return;

    engineRef.current.resume();
    setIsActive(true);
  }, []);

  /**
   * Restart transition
   */
  const restart = useCallback(() => {
    stop();
    setTimeout(() => start(), 50);
  }, [stop, start]);

  /**
   * Update transition configuration
   */
  const setTransition = useCallback((newTransition: Partial<Transition>) => {
    setTransitionConfig((prev) => ({ ...prev, ...newTransition }));
  }, []);

  /**
   * Get current engine state
   */
  const getState = useCallback((): TransitionState | null => {
    if (!engineRef.current) return null;
    return engineRef.current.getState();
  }, []);

  /**
   * Auto-start on mount if enabled
   */
  useEffect(() => {
    if (autoStart) {
      start();
    }
  }, [autoStart]);

  return {
    // State
    isActive,
    progress,
    easedProgress,
    result,

    // Controls
    start,
    stop,
    pause,
    resume,
    restart,

    // Utilities
    setTransition,
    getState,
  };
};

/**
 * useTransitionGroup Hook
 *
 * Manage multiple transitions simultaneously
 */
export interface UseTransitionGroupReturn {
  transitions: Map<string, UseTransitionReturn>;
  startTransition: (id: string, transition?: Partial<Transition>) => void;
  stopTransition: (id: string) => void;
  stopAll: () => void;
  isAnyActive: boolean;
}

export const useTransitionGroup = (): UseTransitionGroupReturn => {
  const [transitions] = useState<Map<string, UseTransitionReturn>>(new Map());
  const [isAnyActive, setIsAnyActive] = useState(false);

  /**
   * Create or get transition instance
   */
  const getOrCreateTransition = useCallback(
    (id: string): UseTransitionReturn => {
      if (!transitions.has(id)) {
        // This is a simplified version - in practice, you'd create the hook instance differently
        throw new Error(
          'useTransitionGroup: Transitions must be pre-created. Use individual useTransition hooks instead.'
        );
      }
      return transitions.get(id)!;
    },
    [transitions]
  );

  /**
   * Start a specific transition
   */
  const startTransition = useCallback(
    (id: string, transition?: Partial<Transition>) => {
      const trans = getOrCreateTransition(id);
      trans.start(transition);
      updateActiveState();
    },
    [getOrCreateTransition]
  );

  /**
   * Stop a specific transition
   */
  const stopTransition = useCallback(
    (id: string) => {
      const trans = getOrCreateTransition(id);
      trans.stop();
      updateActiveState();
    },
    [getOrCreateTransition]
  );

  /**
   * Stop all transitions
   */
  const stopAll = useCallback(() => {
    transitions.forEach((trans) => trans.stop());
    setIsAnyActive(false);
  }, [transitions]);

  /**
   * Update active state
   */
  const updateActiveState = useCallback(() => {
    let anyActive = false;
    transitions.forEach((trans) => {
      if (trans.isActive) anyActive = true;
    });
    setIsAnyActive(anyActive);
  }, [transitions]);

  return {
    transitions,
    startTransition,
    stopTransition,
    stopAll,
    isAnyActive,
  };
};

/**
 * useLayerTransition Hook
 *
 * Specialized hook for transitioning between video layers
 */
export interface UseLayerTransitionOptions extends UseTransitionOptions {
  fromLayerId?: string;
  toLayerId?: string;
}

export const useLayerTransition = (
  initialTransition: Partial<Transition> = {},
  options: UseLayerTransitionOptions = {}
): UseTransitionReturn => {
  const { fromLayerId, toLayerId, ...transitionOptions } = options;

  // Add layer-specific callbacks
  const enhancedOptions: UseTransitionOptions = {
    ...transitionOptions,
    onStart: () => {
      if (transitionOptions.onStart) {
        transitionOptions.onStart();
      }
      // Layer-specific start logic
      console.log(`Transitioning from ${fromLayerId} to ${toLayerId}`);
    },
  };

  return useTransition(initialTransition, enhancedOptions);
};

/**
 * useSceneTransition Hook
 *
 * Specialized hook for transitioning between scenes
 */
export interface UseSceneTransitionOptions extends UseTransitionOptions {
  fromSceneId?: string;
  toSceneId?: string;
}

export const useSceneTransition = (
  initialTransition: Partial<Transition> = {},
  options: UseSceneTransitionOptions = {}
): UseTransitionReturn => {
  const { fromSceneId, toSceneId, ...transitionOptions } = options;

  // Add scene-specific callbacks
  const enhancedOptions: UseTransitionOptions = {
    ...transitionOptions,
    onStart: () => {
      if (transitionOptions.onStart) {
        transitionOptions.onStart();
      }
      // Scene-specific start logic
      console.log(`Transitioning from scene ${fromSceneId} to ${toSceneId}`);
    },
  };

  return useTransition(initialTransition, enhancedOptions);
};
