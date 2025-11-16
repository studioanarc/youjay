/**
 * Video capture utilities for extracting video frames from YouTube players
 * Uses MediaStream API to capture video content for rendering
 */

export interface CaptureOptions {
  fps?: number;
  width?: number;
  height?: number;
}

export interface VideoStreamCapture {
  stream: MediaStream | null;
  videoElement: HTMLVideoElement | null;
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  isCapturing: boolean;
  cleanup: () => void;
}

/**
 * Extract video element from YouTube iframe
 * This searches within the iframe for the actual HTML5 video element
 */
export function extractVideoElement(iframe: HTMLIFrameElement): HTMLVideoElement | null {
  try {
    const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDocument) {
      console.warn('Cannot access iframe document - same-origin policy');
      return null;
    }

    // YouTube uses HTML5 video element with specific class
    const video = iframeDocument.querySelector('video.html5-main-video') as HTMLVideoElement;
    if (video) {
      return video;
    }

    // Fallback: find any video element
    const anyVideo = iframeDocument.querySelector('video') as HTMLVideoElement;
    return anyVideo || null;
  } catch (error) {
    console.error('Error extracting video element:', error);
    return null;
  }
}

/**
 * Create MediaStream from video element using captureStream()
 * This allows us to capture the video content, potentially bypassing ads
 */
export function captureVideoStream(
  videoElement: HTMLVideoElement,
  options: CaptureOptions = {}
): MediaStream | null {
  try {
    // Check if captureStream is supported
    if (!('captureStream' in videoElement) && !('mozCaptureStream' in videoElement)) {
      console.warn('captureStream not supported in this browser');
      return null;
    }

    // Capture stream with optional FPS
    const fps = options.fps || 30;
    const stream = (videoElement as any).captureStream
      ? (videoElement as any).captureStream(fps)
      : (videoElement as any).mozCaptureStream(fps);

    return stream;
  } catch (error) {
    console.error('Error capturing video stream:', error);
    return null;
  }
}

/**
 * Create a complete video capture setup
 * Returns stream, video element, and cleanup function
 */
export function setupVideoCapture(
  iframe: HTMLIFrameElement,
  options: CaptureOptions = {}
): VideoStreamCapture {
  const capture: VideoStreamCapture = {
    stream: null,
    videoElement: null,
    canvas: null,
    context: null,
    isCapturing: false,
    cleanup: () => {},
  };

  try {
    // Extract video element from iframe
    const videoElement = extractVideoElement(iframe);
    if (!videoElement) {
      console.warn('Could not extract video element from iframe');
      return capture;
    }

    capture.videoElement = videoElement;

    // Try to capture stream
    const stream = captureVideoStream(videoElement, options);
    if (stream) {
      capture.stream = stream;
      capture.isCapturing = true;
    }

    // Setup cleanup function
    capture.cleanup = () => {
      if (capture.stream) {
        capture.stream.getTracks().forEach(track => track.stop());
        capture.stream = null;
      }
      capture.isCapturing = false;
    };

    return capture;
  } catch (error) {
    console.error('Error setting up video capture:', error);
    return capture;
  }
}

/**
 * Create a canvas-based frame capture system
 * Useful when captureStream is not available
 */
export function setupCanvasCapture(
  videoElement: HTMLVideoElement,
  options: CaptureOptions = {}
): VideoStreamCapture {
  const capture: VideoStreamCapture = {
    stream: null,
    videoElement,
    canvas: null,
    context: null,
    isCapturing: false,
    cleanup: () => {},
  };

  try {
    // Create canvas
    const canvas = document.createElement('canvas');
    const width = options.width || videoElement.videoWidth || 1920;
    const height = options.height || videoElement.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;
    canvas.style.display = 'none';

    const context = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false,
    });

    if (!context) {
      console.error('Could not get 2D context');
      return capture;
    }

    capture.canvas = canvas;
    capture.context = context;

    // Try to capture stream from canvas
    const fps = options.fps || 30;
    try {
      const stream = canvas.captureStream(fps);
      capture.stream = stream;
    } catch (error) {
      console.warn('Could not capture stream from canvas:', error);
    }

    capture.isCapturing = true;

    // Setup cleanup function
    capture.cleanup = () => {
      if (capture.stream) {
        capture.stream.getTracks().forEach(track => track.stop());
        capture.stream = null;
      }
      if (capture.canvas) {
        capture.canvas.remove();
        capture.canvas = null;
      }
      capture.context = null;
      capture.isCapturing = false;
    };

    return capture;
  } catch (error) {
    console.error('Error setting up canvas capture:', error);
    return capture;
  }
}

/**
 * Draw video frame to canvas
 * Call this in animation loop for canvas-based capture
 */
export function drawVideoFrame(
  capture: VideoStreamCapture,
  options: {
    mirror?: boolean;
    fit?: 'cover' | 'contain' | 'fill';
  } = {}
): boolean {
  if (!capture.videoElement || !capture.canvas || !capture.context) {
    return false;
  }

  const video = capture.videoElement;
  const canvas = capture.canvas;
  const ctx = capture.context;

  try {
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return false;
    }

    // Save context state
    ctx.save();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    if (options.mirror) {
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
    }

    // Calculate dimensions based on fit mode
    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    let dx = 0, dy = 0, dw = canvas.width, dh = canvas.height;

    if (options.fit === 'cover') {
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;

      if (videoRatio > canvasRatio) {
        sw = video.videoHeight * canvasRatio;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / canvasRatio;
        sy = (video.videoHeight - sh) / 2;
      }
    } else if (options.fit === 'contain') {
      const videoRatio = video.videoWidth / video.videoHeight;
      const canvasRatio = canvas.width / canvas.height;

      if (videoRatio > canvasRatio) {
        dh = canvas.width / videoRatio;
        dy = (canvas.height - dh) / 2;
      } else {
        dw = canvas.height * videoRatio;
        dx = (canvas.width - dw) / 2;
      }
    }

    // Draw video frame to canvas
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);

    // Restore context state
    ctx.restore();

    return true;
  } catch (error) {
    console.error('Error drawing video frame:', error);
    return false;
  }
}

/**
 * Get current frame as ImageData
 */
export function getCurrentFrame(capture: VideoStreamCapture): ImageData | null {
  if (!capture.canvas || !capture.context) {
    return null;
  }

  try {
    return capture.context.getImageData(
      0,
      0,
      capture.canvas.width,
      capture.canvas.height
    );
  } catch (error) {
    console.error('Error getting current frame:', error);
    return null;
  }
}

/**
 * Get current frame as Blob
 */
export async function getCurrentFrameBlob(
  capture: VideoStreamCapture,
  type: string = 'image/png'
): Promise<Blob | null> {
  if (!capture.canvas) {
    return null;
  }

  try {
    return new Promise((resolve) => {
      capture.canvas!.toBlob((blob) => {
        resolve(blob);
      }, type);
    });
  } catch (error) {
    console.error('Error getting current frame blob:', error);
    return null;
  }
}

/**
 * Check if video element is playing
 */
export function isVideoPlaying(video: HTMLVideoElement): boolean {
  return !!(video.currentTime > 0 && !video.paused && !video.ended && video.readyState > 2);
}

/**
 * Wait for video to be ready
 */
export function waitForVideoReady(video: HTMLVideoElement, timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (video.readyState >= 3) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      video.removeEventListener('canplay', onCanPlay);
      reject(new Error('Video ready timeout'));
    }, timeout);

    const onCanPlay = () => {
      clearTimeout(timer);
      resolve();
    };

    video.addEventListener('canplay', onCanPlay, { once: true });
  });
}
