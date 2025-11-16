import { useEffect, useRef, useCallback } from 'react';

interface AnimationLoopCallbacks {
  onFrame?: (deltaTime: number, elapsedTime: number) => void;
  onFpsUpdate?: (fps: number) => void;
}

interface AnimationLoopOptions {
  targetFps?: number;
  enabled?: boolean;
}

/**
 * Custom hook for high-performance animation loop using requestAnimationFrame
 * Provides frame timing information and FPS monitoring
 */
export const useAnimationLoop = (
  callbacks: AnimationLoopCallbacks,
  options: AnimationLoopOptions = {}
) => {
  const { enabled = true } = options;
  const { onFrame, onFpsUpdate } = callbacks;

  const frameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsUpdateIntervalRef = useRef<number>(0);

  const animate = useCallback(
    (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime;
      }

      const elapsedTime = (currentTime - startTimeRef.current) / 1000;
      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0;

      lastTimeRef.current = currentTime;

      // Call the frame callback
      if (onFrame && deltaTime > 0) {
        onFrame(deltaTime, elapsedTime);
      }

      // Calculate FPS
      frameCountRef.current++;
      fpsUpdateIntervalRef.current += deltaTime;

      // Update FPS every second
      if (fpsUpdateIntervalRef.current >= 1) {
        const fps = Math.round(frameCountRef.current / fpsUpdateIntervalRef.current);
        if (onFpsUpdate) {
          onFpsUpdate(fps);
        }
        frameCountRef.current = 0;
        fpsUpdateIntervalRef.current = 0;
      }

      // Continue the loop
      frameIdRef.current = requestAnimationFrame(animate);
    },
    [onFrame, onFpsUpdate]
  );

  useEffect(() => {
    if (enabled) {
      // Reset timing
      lastTimeRef.current = 0;
      startTimeRef.current = 0;
      frameCountRef.current = 0;
      fpsUpdateIntervalRef.current = 0;

      // Start the animation loop
      frameIdRef.current = requestAnimationFrame(animate);

      return () => {
        if (frameIdRef.current !== null) {
          cancelAnimationFrame(frameIdRef.current);
        }
      };
    }
  }, [enabled, animate]);

  return {
    start: () => {
      if (!frameIdRef.current && enabled) {
        frameIdRef.current = requestAnimationFrame(animate);
      }
    },
    stop: () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    },
  };
};

export default useAnimationLoop;
