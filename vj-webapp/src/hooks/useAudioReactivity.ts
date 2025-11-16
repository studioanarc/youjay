/**
 * useAudioReactivity - React hook for audio analysis
 * Provides real-time audio analysis at 60fps
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioAnalyzer, type AudioData } from '../utils/AudioAnalyzer';

export interface UseAudioReactivityOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  smoothingFactor?: number;
  enabled?: boolean;
  targetFPS?: number;
}

export interface UseAudioReactivityReturn {
  audioData: AudioData | null;
  isInitialized: boolean;
  error: string | null;
  initialize: (element: HTMLAudioElement | HTMLVideoElement) => Promise<void>;
  initializeFromStream: (stream: MediaStream) => Promise<void>;
  dispose: () => void;
  resume: () => Promise<void>;
  setSmoothingFactor: (factor: number) => void;
  getFrequencyRange: (minFreq: number, maxFreq: number) => number;
}

export function useAudioReactivity(
  options: UseAudioReactivityOptions = {}
): UseAudioReactivityReturn {
  const {
    fftSize = 2048,
    smoothingTimeConstant = 0.8,
    smoothingFactor = 0.8,
    enabled = true,
    targetFPS = 60,
  } = options;

  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Initialize audio analyzer
   */
  const initialize = useCallback(
    async (element: HTMLAudioElement | HTMLVideoElement) => {
      try {
        // Dispose existing analyzer
        if (analyzerRef.current) {
          analyzerRef.current.dispose();
        }

        // Create new analyzer
        const analyzer = new AudioAnalyzer({
          fftSize,
          smoothingTimeConstant,
        });

        analyzer.setSmoothingFactor(smoothingFactor);

        await analyzer.initialize(element);

        analyzerRef.current = analyzer;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio analyzer';
        setError(errorMessage);
        setIsInitialized(false);
      }
    },
    [fftSize, smoothingTimeConstant, smoothingFactor]
  );

  /**
   * Initialize from media stream
   */
  const initializeFromStream = useCallback(
    async (stream: MediaStream) => {
      try {
        // Dispose existing analyzer
        if (analyzerRef.current) {
          analyzerRef.current.dispose();
        }

        // Create new analyzer
        const analyzer = new AudioAnalyzer({
          fftSize,
          smoothingTimeConstant,
        });

        analyzer.setSmoothingFactor(smoothingFactor);

        await analyzer.initializeFromStream(stream);

        analyzerRef.current = analyzer;
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize audio analyzer';
        setError(errorMessage);
        setIsInitialized(false);
      }
    },
    [fftSize, smoothingTimeConstant, smoothingFactor]
  );

  /**
   * Resume audio context
   */
  const resume = useCallback(async () => {
    if (analyzerRef.current) {
      await analyzerRef.current.resume();
    }
  }, []);

  /**
   * Set smoothing factor
   */
  const setSmoothingFactor = useCallback((factor: number) => {
    if (analyzerRef.current) {
      analyzerRef.current.setSmoothingFactor(factor);
    }
  }, []);

  /**
   * Get frequency range
   */
  const getFrequencyRange = useCallback((minFreq: number, maxFreq: number): number => {
    if (analyzerRef.current) {
      return analyzerRef.current.getFrequencyRange(minFreq, maxFreq);
    }
    return 0;
  }, []);

  /**
   * Dispose analyzer
   */
  const dispose = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.dispose();
      analyzerRef.current = null;
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setIsInitialized(false);
    setAudioData(null);
  }, []);

  /**
   * Animation loop for audio analysis
   */
  useEffect(() => {
    if (!enabled || !isInitialized || !analyzerRef.current) {
      return;
    }

    const frameInterval = 1000 / targetFPS;
    let lastFrameTime = performance.now();

    const analyze = () => {
      const now = performance.now();
      const elapsed = now - lastFrameTime;

      // Throttle to target FPS
      if (elapsed >= frameInterval) {
        if (analyzerRef.current) {
          const data = analyzerRef.current.getAudioData();
          if (data) {
            setAudioData(data);
          }
        }
        lastFrameTime = now - (elapsed % frameInterval);
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [enabled, isInitialized, targetFPS]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      dispose();
    };
  }, [dispose]);

  return {
    audioData,
    isInitialized,
    error,
    initialize,
    initializeFromStream,
    dispose,
    resume,
    setSmoothingFactor,
    getFrequencyRange,
  };
}
