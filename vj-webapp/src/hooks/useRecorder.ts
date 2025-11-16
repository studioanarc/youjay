/**
 * useRecorder - React hook for video recording
 */

import { useRef, useCallback, useEffect } from 'react';
import { useVJStore } from '../store';
import { VideoRecorder } from '../utils/VideoRecorder';
import { StreamCapture } from '../utils/StreamCapture';
import type { RecordingConfig } from '../types';

export interface UseRecorderOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  config?: RecordingConfig;
  includeAudio?: boolean;
  audioContext?: AudioContext;
}

export interface UseRecorderResult {
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  downloadRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  estimatedSize: number;
  formattedDuration: string;
  formattedSize: string;
  supportedMimeTypes: string[];
}

const DEFAULT_CONFIG: RecordingConfig = {
  format: 'webm',
  quality: 'high',
  fps: 60,
  videoBitrate: 10_000_000,
  audioBitrate: 128_000,
};

export const useRecorder = ({
  canvasRef,
  config = DEFAULT_CONFIG,
  includeAudio = false,
  audioContext,
}: UseRecorderOptions): UseRecorderResult => {
  const recorderRef = useRef<VideoRecorder | null>(null);
  const streamCaptureRef = useRef<StreamCapture | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

  const { recordingState, setRecordingState } = useVJStore();
  const { isRecording, isPaused, duration } = recordingState;

  // Update duration in real-time
  const updateDuration = useCallback(() => {
    if (recorderRef.current && recorderRef.current.isRecording()) {
      const currentDuration = recorderRef.current.getDuration();

      setRecordingState({
        duration: currentDuration,
        chunks: [], // We don't need to store chunks in state
      });

      // Continue updating
      animationFrameRef.current = requestAnimationFrame(updateDuration);
    }
  }, [setRecordingState]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!canvasRef.current) {
      console.error('Canvas ref is not available');
      return;
    }

    if (isRecording) {
      console.warn('Recording already in progress');
      return;
    }

    try {
      // Initialize stream capture
      streamCaptureRef.current = new StreamCapture();
      const stream = streamCaptureRef.current.captureCanvas(canvasRef.current, {
        fps: config.fps,
      });

      // Add audio if requested
      if (includeAudio) {
        await streamCaptureRef.current.addAudioTrack(audioContext);
      }

      // Initialize recorder
      recorderRef.current = new VideoRecorder();

      // Start recording
      recorderRef.current.start(stream, config, {
        onStart: () => {
          setRecordingState({
            isRecording: true,
            isPaused: false,
            duration: 0,
            chunks: [],
          });

          // Start duration updates
          updateDuration();
        },
        onStop: (blob) => {
          recordedBlobRef.current = blob;

          setRecordingState({
            isRecording: false,
            isPaused: false,
            duration: 0,
            chunks: [],
          });

          // Stop duration updates
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }

          // Clean up stream
          streamCaptureRef.current?.stopStream();
        },
        onPause: () => {
          setRecordingState({ isPaused: true });
        },
        onResume: () => {
          setRecordingState({ isPaused: false });
          updateDuration();
        },
        onError: (error) => {
          console.error('Recording error:', error);
          setRecordingState({
            isRecording: false,
            isPaused: false,
          });
        },
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  }, [canvasRef, config, includeAudio, audioContext, isRecording, setRecordingState, updateDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!recorderRef.current) return;

    recorderRef.current.stop();
  }, []);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (!recorderRef.current) return;

    recorderRef.current.pause();

    // Stop duration updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (!recorderRef.current) return;

    recorderRef.current.resume();
  }, []);

  // Download recording
  const downloadRecording = useCallback(() => {
    if (!recordedBlobRef.current) {
      console.warn('No recording available to download');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `vj-recording-${timestamp}.${config.format}`;

    VideoRecorder.downloadVideo(recordedBlobRef.current, filename);
  }, [config.format]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      streamCaptureRef.current?.stopStream();

      if (recorderRef.current && recorderRef.current.isRecording()) {
        recorderRef.current.stop();
      }
    };
  }, []);

  // Get estimated file size
  const estimatedSize = recorderRef.current?.getEstimatedSize() || 0;

  return {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    isRecording,
    isPaused,
    duration,
    estimatedSize,
    formattedDuration: VideoRecorder.formatDuration(duration),
    formattedSize: VideoRecorder.formatFileSize(estimatedSize),
    supportedMimeTypes: VideoRecorder.getSupportedMimeTypes(),
  };
};
