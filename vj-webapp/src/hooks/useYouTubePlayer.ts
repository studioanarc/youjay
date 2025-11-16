/**
 * React hook for YouTube player pool
 * Provides easy access to YouTube player functionality in React components
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { YouTubePlayerPool, getPlayerPool, type PlayerInstance, type QueuedVideo } from '../utils/YouTubePlayerPool';
import { extractVideoId } from '../utils/youtubeUtils';

export interface UseYouTubePlayerOptions {
  poolSize?: number;
  prebufferTime?: number;
  autoInitialize?: boolean;
}

export interface PlayerState {
  isReady: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isBuffering: boolean;
  currentTime: number;
  duration: number;
  error?: string;
  videoId?: string;
  playerId?: string;
}

export interface UseYouTubePlayerReturn {
  // State
  playerState: PlayerState;
  poolStatus: {
    total: number;
    ready: number;
    loading: number;
    playing: number;
    buffering: number;
    paused: number;
  };
  isInitialized: boolean;

  // Methods
  initialize: () => Promise<void>;
  loadVideo: (videoUrl: string, options?: {
    playerId?: string;
    autoplay?: boolean;
    startTime?: number;
    layerId?: string;
  }) => Promise<PlayerInstance | null>;
  play: (playerId: string) => void;
  pause: (playerId: string) => void;
  stop: (playerId: string) => void;
  seekTo: (playerId: string, seconds: number) => void;
  setVolume: (playerId: string, volume: number) => void;
  setPlaybackRate: (playerId: string, rate: number) => void;
  queueVideo: (video: QueuedVideo) => void;
  getPlayer: (playerId: string) => PlayerInstance | null;
  getPlayerByVideoId: (videoId: string) => PlayerInstance | null;
  getCurrentTime: (playerId: string) => number;
  getDuration: (playerId: string) => number;
  getAllPlayers: () => PlayerInstance[];
}

export function useYouTubePlayer(options: UseYouTubePlayerOptions = {}): UseYouTubePlayerReturn {
  const {
    poolSize = 6,
    prebufferTime = 45,
    autoInitialize = true,
  } = options;

  const poolRef = useRef<YouTubePlayerPool | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerState, setPlayerState] = useState<PlayerState>({
    isReady: false,
    isPlaying: false,
    isPaused: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
  });
  const [poolStatus, setPoolStatus] = useState({
    total: 0,
    ready: 0,
    loading: 0,
    playing: 0,
    buffering: 0,
    paused: 0,
  });

  // Animation frame for updating current time
  const animationFrameRef = useRef<number>(0);

  /**
   * Initialize the player pool
   */
  const initialize = useCallback(async () => {
    if (poolRef.current && isInitialized) {
      return;
    }

    try {
      const pool = getPlayerPool({ poolSize, prebufferTime });
      poolRef.current = pool;
      await pool.initialize();
      setIsInitialized(true);

      // Update pool status
      setPoolStatus(pool.getPoolStatus());

      console.log('YouTube player pool initialized');
    } catch (error) {
      console.error('Failed to initialize YouTube player pool:', error);
      throw error;
    }
  }, [poolSize, prebufferTime, isInitialized]);

  /**
   * Load a video
   */
  const loadVideo = useCallback(async (
    videoUrl: string,
    options?: {
      playerId?: string;
      autoplay?: boolean;
      startTime?: number;
      layerId?: string;
    }
  ) => {
    if (!poolRef.current) {
      await initialize();
    }

    const player = await poolRef.current!.loadVideo(videoUrl, options);

    if (player) {
      const videoId = extractVideoId(videoUrl);
      setPlayerState(prev => ({
        ...prev,
        playerId: player.playerId,
        videoId: videoId || undefined,
        isReady: player.status === 'ready',
        error: player.error,
      }));

      // Update pool status
      setPoolStatus(poolRef.current!.getPoolStatus());
    }

    return player;
  }, [initialize]);

  /**
   * Play a video
   */
  const play = useCallback((playerId: string) => {
    if (!poolRef.current) return;

    poolRef.current.play(playerId);
    setPlayerState(prev => ({
      ...prev,
      isPlaying: true,
      isPaused: false,
      playerId,
    }));

    // Start updating current time
    const updateTime = () => {
      if (!poolRef.current) return;

      const currentTime = poolRef.current.getCurrentTime(playerId);
      const duration = poolRef.current.getDuration(playerId);

      setPlayerState(prev => ({
        ...prev,
        currentTime,
        duration,
      }));

      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);
  }, []);

  /**
   * Pause a video
   */
  const pause = useCallback((playerId: string) => {
    if (!poolRef.current) return;

    poolRef.current.pause(playerId);
    setPlayerState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: true,
    }));

    // Stop updating current time
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  /**
   * Stop a video
   */
  const stop = useCallback((playerId: string) => {
    if (!poolRef.current) return;

    poolRef.current.stop(playerId);
    setPlayerState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    }));

    // Stop updating current time
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  /**
   * Seek to a specific time
   */
  const seekTo = useCallback((playerId: string, seconds: number) => {
    if (!poolRef.current) return;

    poolRef.current.seekTo(playerId, seconds);
    setPlayerState(prev => ({
      ...prev,
      currentTime: seconds,
    }));
  }, []);

  /**
   * Set volume
   */
  const setVolume = useCallback((playerId: string, volume: number) => {
    if (!poolRef.current) return;
    poolRef.current.setVolume(playerId, volume);
  }, []);

  /**
   * Set playback rate
   */
  const setPlaybackRate = useCallback((playerId: string, rate: number) => {
    if (!poolRef.current) return;
    poolRef.current.setPlaybackRate(playerId, rate);
  }, []);

  /**
   * Queue a video for prebuffering
   */
  const queueVideo = useCallback((video: QueuedVideo) => {
    if (!poolRef.current) return;
    poolRef.current.queueVideo(video);
  }, []);

  /**
   * Get a player by ID
   */
  const getPlayer = useCallback((playerId: string): PlayerInstance | null => {
    if (!poolRef.current) return null;
    return poolRef.current.getPlayer(playerId);
  }, []);

  /**
   * Get a player by video ID
   */
  const getPlayerByVideoId = useCallback((videoId: string): PlayerInstance | null => {
    if (!poolRef.current) return null;
    return poolRef.current.getPlayerByVideoId(videoId);
  }, []);

  /**
   * Get current time
   */
  const getCurrentTime = useCallback((playerId: string): number => {
    if (!poolRef.current) return 0;
    return poolRef.current.getCurrentTime(playerId);
  }, []);

  /**
   * Get duration
   */
  const getDuration = useCallback((playerId: string): number => {
    if (!poolRef.current) return 0;
    return poolRef.current.getDuration(playerId);
  }, []);

  /**
   * Get all players
   */
  const getAllPlayers = useCallback((): PlayerInstance[] => {
    if (!poolRef.current) return [];
    return poolRef.current.getAllPlayers();
  }, []);

  /**
   * Setup event listeners
   */
  useEffect(() => {
    if (!poolRef.current) return;

    // Listen for state changes
    const unsubscribeStateChange = poolRef.current.onStateChange((playerId, state, _videoId) => {
      setPlayerState(prev => {
        if (prev.playerId !== playerId) return prev;

        return {
          ...prev,
          isPlaying: state === 'playing',
          isPaused: state === 'paused',
          isBuffering: state === 'buffering',
          isReady: state === 'ready' || state === 'playing' || state === 'paused',
        };
      });

      // Update pool status
      setPoolStatus(poolRef.current!.getPoolStatus());
    });

    // Listen for errors
    const unsubscribeError = poolRef.current.onError((playerId, error, _videoId) => {
      setPlayerState(prev => {
        if (prev.playerId !== playerId) return prev;

        return {
          ...prev,
          error,
          isReady: false,
        };
      });
    });

    return () => {
      unsubscribeStateChange();
      unsubscribeError();
    };
  }, [isInitialized]);

  /**
   * Auto-initialize if requested
   */
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      initialize().catch(console.error);
    }
  }, [autoInitialize, isInitialized, initialize]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return {
    playerState,
    poolStatus,
    isInitialized,
    initialize,
    loadVideo,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setPlaybackRate,
    queueVideo,
    getPlayer,
    getPlayerByVideoId,
    getCurrentTime,
    getDuration,
    getAllPlayers,
  };
}

/**
 * Hook for managing a single YouTube player
 */
export function useSingleYouTubePlayer(videoUrl?: string, options: {
  autoplay?: boolean;
  startTime?: number;
  loop?: boolean;
} = {}) {
  const {
    playerState,
    isInitialized,
    loadVideo,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setPlaybackRate,
    getCurrentTime,
    getDuration,
  } = useYouTubePlayer({ autoInitialize: true });

  const [currentPlayerId, setCurrentPlayerId] = useState<string>();

  /**
   * Load video when URL changes
   */
  useEffect(() => {
    if (videoUrl && isInitialized) {
      loadVideo(videoUrl, {
        autoplay: options.autoplay,
        startTime: options.startTime,
      }).then(player => {
        if (player) {
          setCurrentPlayerId(player.playerId);
        }
      });
    }
  }, [videoUrl, isInitialized, options.autoplay, options.startTime]);

  /**
   * Handle looping
   */
  useEffect(() => {
    if (!options.loop || !currentPlayerId) return;

    const checkLoop = () => {
      const currentTime = getCurrentTime(currentPlayerId);
      const duration = getDuration(currentPlayerId);

      if (duration > 0 && currentTime >= duration - 0.5) {
        seekTo(currentPlayerId, 0);
        play(currentPlayerId);
      }
    };

    const interval = setInterval(checkLoop, 500);
    return () => clearInterval(interval);
  }, [options.loop, currentPlayerId, getCurrentTime, getDuration, seekTo, play]);

  return {
    playerState,
    isInitialized,
    playerId: currentPlayerId,
    play: () => currentPlayerId && play(currentPlayerId),
    pause: () => currentPlayerId && pause(currentPlayerId),
    stop: () => currentPlayerId && stop(currentPlayerId),
    seekTo: (seconds: number) => currentPlayerId && seekTo(currentPlayerId, seconds),
    setVolume: (volume: number) => currentPlayerId && setVolume(currentPlayerId, volume),
    setPlaybackRate: (rate: number) => currentPlayerId && setPlaybackRate(currentPlayerId, rate),
    getCurrentTime: () => currentPlayerId ? getCurrentTime(currentPlayerId) : 0,
    getDuration: () => currentPlayerId ? getDuration(currentPlayerId) : 0,
  };
}
