/**
 * StreamCapture - Utility for capturing canvas output as MediaStream
 */

export interface StreamCaptureOptions {
  fps?: number;
}

export class StreamCapture {
  private stream: MediaStream | null = null;

  /**
   * Capture a canvas element as a MediaStream
   */
  captureCanvas(canvas: HTMLCanvasElement, options: StreamCaptureOptions = {}): MediaStream {
    const { fps = 30 } = options;

    // Capture the canvas at the specified framerate
    const stream = canvas.captureStream(fps);
    this.stream = stream;

    return stream;
  }

  /**
   * Add audio track to the stream
   */
  async addAudioTrack(audioContext?: AudioContext): Promise<void> {
    if (!this.stream) {
      throw new Error('No stream available. Call captureCanvas first.');
    }

    try {
      // Get audio from user's microphone or audio context
      let audioStream: MediaStream;

      if (audioContext) {
        // Create a MediaStreamDestination from the audio context
        const destination = audioContext.createMediaStreamDestination();
        audioStream = destination.stream;
      } else {
        // Get microphone audio
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false
        });
      }

      // Add audio tracks to the canvas stream
      audioStream.getAudioTracks().forEach(track => {
        this.stream?.addTrack(track);
      });
    } catch (error) {
      console.warn('Failed to add audio track:', error);
      // Continue without audio
    }
  }

  /**
   * Get the current stream
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Stop all tracks in the stream
   */
  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Check if stream is active
   */
  isActive(): boolean {
    return this.stream?.active ?? false;
  }
}
