/**
 * useBPM - React hook for BPM detection and synchronization
 * Provides beat detection, tap tempo, and beat phase information
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { BPMDetector, type BPMData } from '../utils/BPMDetector';
import type { AudioData } from '../utils/AudioAnalyzer';

export interface UseBPMOptions {
  minBPM?: number;
  maxBPM?: number;
  sensitivity?: number;
  enabled?: boolean;
  autoSync?: boolean;
  onBeatDetected?: (bpm: number) => void;
  onBPMChange?: (bpm: number) => void;
}

export interface UseBPMReturn {
  bpm: number;
  confidence: number;
  beatDetected: boolean;
  beatPhase: number;
  isOnBeat: boolean;
  timeToNextBeat: number;
  tap: () => void;
  setBPM: (bpm: number) => void;
  reset: () => void;
  setSensitivity: (sensitivity: number) => void;
}

export function useBPM(audioData: AudioData | null, options: UseBPMOptions = {}): UseBPMReturn {
  const {
    minBPM = 60,
    maxBPM = 180,
    sensitivity = 1.3,
    enabled = true,
    onBeatDetected,
    onBPMChange,
  } = options;

  const [bpm, setBPMState] = useState(120);
  const [confidence, setConfidence] = useState(0);
  const [beatDetected, setBeatDetected] = useState(false);
  const [beatPhase, setBeatPhase] = useState(0);
  const [isOnBeat, setIsOnBeat] = useState(false);
  const [timeToNextBeat, setTimeToNextBeat] = useState(0);

  const detectorRef = useRef<BPMDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastBPMRef = useRef<number>(120);

  /**
   * Initialize detector
   */
  useEffect(() => {
    detectorRef.current = new BPMDetector({
      minBPM,
      maxBPM,
      sensitivity,
    });

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [minBPM, maxBPM, sensitivity]);

  /**
   * Process audio data for beat detection
   */
  useEffect(() => {
    if (!enabled || !audioData || !detectorRef.current) {
      return;
    }

    const data: BPMData = detectorRef.current.processBeat({
      bass: audioData.bass,
      mid: audioData.mid,
      amplitude: audioData.amplitude,
    });

    setBPMState(data.bpm);
    setConfidence(data.confidence);
    setBeatDetected(data.beatDetected);

    // Call callbacks
    if (data.beatDetected && onBeatDetected) {
      onBeatDetected(data.bpm);
    }

    if (data.bpm !== lastBPMRef.current) {
      lastBPMRef.current = data.bpm;
      if (onBPMChange) {
        onBPMChange(data.bpm);
      }
    }
  }, [audioData, enabled, onBeatDetected, onBPMChange]);

  /**
   * Update beat phase and timing information
   */
  useEffect(() => {
    if (!enabled || !detectorRef.current) {
      return;
    }

    const updatePhase = () => {
      if (detectorRef.current) {
        const phase = detectorRef.current.getBeatPhase();
        const onBeat = detectorRef.current.isOnBeat();
        const timeToNext = detectorRef.current.getTimeToNextBeat();

        setBeatPhase(phase);
        setIsOnBeat(onBeat);
        setTimeToNextBeat(timeToNext);
      }

      animationFrameRef.current = requestAnimationFrame(updatePhase);
    };

    animationFrameRef.current = requestAnimationFrame(updatePhase);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  /**
   * Tap tempo
   */
  const tap = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.tap();
      const newBPM = detectorRef.current.getBPM();
      setBPMState(newBPM);
      setConfidence(1);
    }
  }, []);

  /**
   * Set BPM manually
   */
  const setBPM = useCallback((newBPM: number) => {
    if (detectorRef.current) {
      detectorRef.current.setBPM(newBPM);
      setBPMState(newBPM);
      setConfidence(1);
    }
  }, []);

  /**
   * Reset detector
   */
  const reset = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.reset();
      setBPMState(120);
      setConfidence(0);
      setBeatDetected(false);
    }
  }, []);

  /**
   * Set sensitivity
   */
  const setSensitivity = useCallback((newSensitivity: number) => {
    if (detectorRef.current) {
      detectorRef.current.setSensitivity(newSensitivity);
    }
  }, []);

  return {
    bpm,
    confidence,
    beatDetected,
    beatPhase,
    isOnBeat,
    timeToNextBeat,
    tap,
    setBPM,
    reset,
    setSensitivity,
  };
}
