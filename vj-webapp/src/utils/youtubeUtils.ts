/**
 * YouTube utilities for parsing URLs and managing player IDs
 */

/**
 * Extract YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  if (!url) return null;

  // Remove whitespace
  url = url.trim();

  // If it's already just an ID (11 characters, alphanumeric with _ and -)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  // Try various URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Validate if a string is a valid YouTube video ID
 */
export function isValidVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Build YouTube embed URL from video ID
 */
export function buildEmbedUrl(videoId: string, options?: {
  autoplay?: boolean;
  controls?: boolean;
  mute?: boolean;
  loop?: boolean;
  playsinline?: boolean;
  enablejsapi?: boolean;
  origin?: string;
}): string {
  const params = new URLSearchParams();

  // Default options for VJ app
  params.append('enablejsapi', '1');
  params.append('origin', options?.origin || window.location.origin);
  params.append('playsinline', '1');
  params.append('rel', '0');
  params.append('modestbranding', '1');
  params.append('iv_load_policy', '3');

  // User options
  if (options?.autoplay) params.append('autoplay', '1');
  if (options?.controls !== undefined) params.append('controls', options.controls ? '1' : '0');
  if (options?.mute) params.append('mute', '1');
  if (options?.loop) {
    params.append('loop', '1');
    params.append('playlist', videoId); // Required for loop to work
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Generate unique player ID
 */
export function generatePlayerId(): string {
  return `yt-player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if YouTube IFrame API is loaded
 */
export function isYouTubeAPIReady(): boolean {
  return typeof window !== 'undefined' && window.YT && window.YT.Player;
}

/**
 * Load YouTube IFrame API
 * Returns a promise that resolves when the API is ready
 */
export function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (isYouTubeAPIReady()) {
      resolve();
      return;
    }

    // Already loading
    if ((window as any).youTubeAPILoading) {
      const checkInterval = setInterval(() => {
        if (isYouTubeAPIReady()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Start loading
    (window as any).youTubeAPILoading = true;

    // Create script tag
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    tag.onerror = () => reject(new Error('Failed to load YouTube API'));

    // Set up callback
    (window as any).onYouTubeIframeAPIReady = () => {
      (window as any).youTubeAPILoading = false;
      resolve();
    };

    // Add to page
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  });
}

/**
 * Get player state name from YouTube player state code
 */
export function getPlayerStateName(state: number): string {
  const states: Record<number, string> = {
    '-1': 'unstarted',
    '0': 'ended',
    '1': 'playing',
    '2': 'paused',
    '3': 'buffering',
    '5': 'cued',
  };
  return states[state] || 'unknown';
}

/**
 * YouTube player state codes
 */
export const YT_PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

/**
 * Format time in seconds to MM:SS
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate buffering progress
 */
export function getBufferingProgress(player: any): number {
  try {
    const loaded = player.getVideoLoadedFraction();
    return loaded * 100;
  } catch {
    return 0;
  }
}

// Type declarations for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
