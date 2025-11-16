/**
 * VideoRecorder - MediaRecorder API wrapper for recording canvas output
 */

import type { RecordingConfig } from '../types';

export interface VideoRecorderCallbacks {
  onStart?: () => void;
  onStop?: (blob: Blob) => void;
  onPause?: () => void;
  onResume?: () => void;
  onError?: (error: Error) => void;
  onDataAvailable?: (chunk: Blob) => void;
}

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private lastPauseTime: number = 0;
  private callbacks: VideoRecorderCallbacks = {};

  /**
   * Get supported MIME types for recording
   */
  static getSupportedMimeTypes(): string[] {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    return types.filter(type => MediaRecorder.isTypeSupported(type));
  }

  /**
   * Get MIME type based on quality setting
   */
  static getMimeType(quality: RecordingConfig['quality']): string {
    const supported = VideoRecorder.getSupportedMimeTypes();

    if (quality === 'ultra' || quality === 'high') {
      // Prefer VP9 for higher quality
      const vp9 = supported.find(type => type.includes('vp9'));
      if (vp9) return vp9;
    }

    // Default to first supported type
    return supported[0] || 'video/webm';
  }

  /**
   * Get video bitrate based on quality setting
   */
  static getVideoBitrate(quality: RecordingConfig['quality']): number {
    const bitrates = {
      low: 2_500_000,      // 2.5 Mbps
      medium: 5_000_000,   // 5 Mbps
      high: 10_000_000,    // 10 Mbps
      ultra: 20_000_000,   // 20 Mbps
    };

    return bitrates[quality];
  }

  /**
   * Start recording from a MediaStream
   */
  start(stream: MediaStream, config: RecordingConfig, callbacks?: VideoRecorderCallbacks): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      throw new Error('Recording already in progress');
    }

    this.callbacks = callbacks || {};
    this.chunks = [];

    const mimeType = VideoRecorder.getMimeType(config.quality);
    const videoBitsPerSecond = config.videoBitrate || VideoRecorder.getVideoBitrate(config.quality);

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond,
        audioBitsPerSecond: config.audioBitrate || 128_000,
      });

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
          this.callbacks.onDataAvailable?.(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        this.callbacks.onStop?.(blob);
      };

      this.mediaRecorder.onerror = () => {
        const error = new Error('MediaRecorder error');
        this.callbacks.onError?.(error);
      };

      // Request data every second for progress tracking
      this.mediaRecorder.start(1000);
      this.startTime = Date.now();
      this.pausedDuration = 0;

      this.callbacks.onStart?.();
    } catch (error) {
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return;
    }

    this.mediaRecorder.stop();
  }

  /**
   * Pause recording
   */
  pause(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') {
      return;
    }

    this.mediaRecorder.pause();
    this.lastPauseTime = Date.now();
    this.callbacks.onPause?.();
  }

  /**
   * Resume recording
   */
  resume(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state !== 'paused') {
      return;
    }

    this.pausedDuration += Date.now() - this.lastPauseTime;
    this.mediaRecorder.resume();
    this.callbacks.onResume?.();
  }

  /**
   * Get current recording duration in milliseconds
   */
  getDuration(): number {
    if (!this.startTime) return 0;

    const now = Date.now();
    const elapsed = now - this.startTime - this.pausedDuration;

    // If paused, subtract the current pause duration
    if (this.mediaRecorder?.state === 'paused') {
      return elapsed - (now - this.lastPauseTime);
    }

    return elapsed;
  }

  /**
   * Estimate file size based on current chunks
   */
  getEstimatedSize(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.size, 0);
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return this.mediaRecorder?.state || 'inactive';
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Check if paused
   */
  isPaused(): boolean {
    return this.mediaRecorder?.state === 'paused';
  }

  /**
   * Download the recorded video
   */
  static downloadVideo(blob: Blob, filename: string = 'recording.webm'): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Format duration as HH:MM:SS
   */
  static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const s = seconds % 60;
    const m = minutes % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
