/**
 * YouTube Player Pool Manager
 * Manages a pool of hidden YouTube iframe players for prebuffering and smooth playback
 */

import type { YouTubePlayer } from '../types';
import {
  loadYouTubeAPI,
  generatePlayerId,
  extractVideoId,
  isValidVideoId,
  YT_PLAYER_STATES,
  getPlayerStateName,
} from './youtubeUtils';
import { setupVideoCapture, type VideoStreamCapture } from './videoCapture';

export interface PlayerPoolConfig {
  poolSize?: number;
  prebufferTime?: number; // seconds before needed
  containerElement?: HTMLElement;
  defaultVolume?: number;
  defaultQuality?: string;
}

export interface QueuedVideo {
  videoId: string;
  playAt?: number; // timestamp when this should start playing
  layerId?: string;
  priority?: number;
}

export interface PlayerInstance extends YouTubePlayer {
  element: HTMLDivElement;
  iframe?: HTMLIFrameElement;
  capture?: VideoStreamCapture;
  queuedVideo?: QueuedVideo;
  lastUsed: number;
  error?: string;
}

type PlayerStateChangeCallback = (playerId: string, state: string, videoId: string) => void;
type PlayerReadyCallback = (playerId: string, videoId: string) => void;
type PlayerErrorCallback = (playerId: string, error: string, videoId: string) => void;

export class YouTubePlayerPool {
  private players: Map<string, PlayerInstance> = new Map();
  private poolSize: number;
  private prebufferTime: number;
  private container: HTMLElement;
  private isInitialized: boolean = false;
  private videoQueue: QueuedVideo[] = [];
  private defaultVolume: number;

  // Callbacks
  private onStateChangeCallbacks: PlayerStateChangeCallback[] = [];
  private onReadyCallbacks: PlayerReadyCallback[] = [];
  private onErrorCallbacks: PlayerErrorCallback[] = [];

  constructor(config: PlayerPoolConfig = {}) {
    this.poolSize = config.poolSize || 6;
    this.prebufferTime = config.prebufferTime || 45;
    this.defaultVolume = config.defaultVolume || 50;
    // defaultQuality could be used in the future
    // const defaultQuality = config.defaultQuality || 'hd720';

    // Create or use container element
    if (config.containerElement) {
      this.container = config.containerElement;
    } else {
      this.container = this.createContainer();
    }
  }

  /**
   * Create hidden container for player pool
   */
  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'youtube-player-pool';
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
      pointer-events: none;
      visibility: hidden;
      opacity: 0;
    `;
    document.body.appendChild(container);
    return container;
  }

  /**
   * Initialize the player pool
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Load YouTube API
      await loadYouTubeAPI();

      // Create initial pool of players
      const initPromises = [];
      for (let i = 0; i < this.poolSize; i++) {
        initPromises.push(this.createPlayer());
      }

      await Promise.all(initPromises);
      this.isInitialized = true;

      console.log(`YouTubePlayerPool initialized with ${this.poolSize} players`);
    } catch (error) {
      console.error('Failed to initialize YouTube player pool:', error);
      throw error;
    }
  }

  /**
   * Create a new player instance
   */
  private async createPlayer(): Promise<PlayerInstance> {
    return new Promise((resolve, reject) => {
      const playerId = generatePlayerId();
      const element = document.createElement('div');
      element.id = playerId;
      element.style.cssText = 'width: 640px; height: 360px;';
      this.container.appendChild(element);

      const playerInstance: PlayerInstance = {
        id: playerId,
        playerId: playerId,
        videoId: '',
        player: null,
        status: 'loading',
        hidden: true,
        element: element,
        lastUsed: Date.now(),
      };

      try {
        const player = new window.YT.Player(playerId, {
          width: 640,
          height: 360,
          videoId: '', // Start with no video
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event: any) => {
              playerInstance.player = event.target;
              playerInstance.status = 'ready';

              // Get iframe element
              const iframe = element.querySelector('iframe') as HTMLIFrameElement;
              if (iframe) {
                playerInstance.iframe = iframe;
                iframe.style.cssText = 'width: 100%; height: 100%;';
              }

              // Set default volume
              player.setVolume(this.defaultVolume);

              this.players.set(playerId, playerInstance);
              console.log(`Player ${playerId} ready`);
              resolve(playerInstance);
            },
            onStateChange: (event: any) => {
              this.handleStateChange(playerInstance, event.data);
            },
            onError: (event: any) => {
              this.handleError(playerInstance, event.data);
            },
          },
        });
      } catch (error) {
        console.error('Error creating player:', error);
        reject(error);
      }
    });
  }

  /**
   * Handle player state changes
   */
  private handleStateChange(player: PlayerInstance, state: number): void {
    const stateName = getPlayerStateName(state);

    // Update player status
    switch (state) {
      case YT_PLAYER_STATES.PLAYING:
        player.status = 'playing';
        break;
      case YT_PLAYER_STATES.PAUSED:
        player.status = 'paused';
        break;
      case YT_PLAYER_STATES.BUFFERING:
        player.status = 'buffering';
        break;
      case YT_PLAYER_STATES.ENDED:
        player.status = 'ready';
        break;
      case YT_PLAYER_STATES.CUED:
        player.status = 'ready';
        break;
    }

    // Notify callbacks
    this.onStateChangeCallbacks.forEach(cb => {
      cb(player.playerId, stateName, player.videoId);
    });

    console.log(`Player ${player.playerId} state: ${stateName}, video: ${player.videoId}`);
  }

  /**
   * Handle player errors
   */
  private handleError(player: PlayerInstance, errorCode: number): void {
    const errorMessages: Record<number, string> = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found or private',
      101: 'Video not allowed to be played in embedded players',
      150: 'Video not allowed to be played in embedded players',
    };

    const error = errorMessages[errorCode] || `Unknown error: ${errorCode}`;
    player.error = error;
    player.status = 'ready'; // Mark as ready for reuse

    console.error(`Player ${player.playerId} error: ${error}`);

    // Notify callbacks
    this.onErrorCallbacks.forEach(cb => {
      cb(player.playerId, error, player.videoId);
    });
  }

  /**
   * Load a video into a player
   */
  async loadVideo(videoUrl: string, options: {
    playerId?: string;
    autoplay?: boolean;
    startTime?: number;
    layerId?: string;
  } = {}): Promise<PlayerInstance | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId || !isValidVideoId(videoId)) {
      console.error('Invalid video URL or ID:', videoUrl);
      return null;
    }

    // Find or get player
    let player: PlayerInstance | undefined;

    if (options.playerId) {
      player = this.players.get(options.playerId);
    } else {
      player = this.getAvailablePlayer();
    }

    if (!player) {
      console.error('No available player found');
      return null;
    }

    // Load video
    try {
      player.videoId = videoId;
      player.status = 'loading';
      player.lastUsed = Date.now();
      player.error = undefined;

      if (options.autoplay) {
        player.player.loadVideoById({
          videoId: videoId,
          startSeconds: options.startTime || 0,
        });
      } else {
        player.player.cueVideoById({
          videoId: videoId,
          startSeconds: options.startTime || 0,
        });
      }

      // Setup video capture if iframe is available
      if (player.iframe) {
        // Clean up existing capture
        if (player.capture) {
          player.capture.cleanup();
        }

        // Wait a bit for video to load in iframe
        setTimeout(() => {
          if (player!.iframe) {
            player!.capture = setupVideoCapture(player!.iframe);
          }
        }, 1000);
      }

      return player;
    } catch (error) {
      console.error('Error loading video:', error);
      player.status = 'ready';
      player.error = String(error);
      return null;
    }
  }

  /**
   * Get an available player from the pool
   */
  private getAvailablePlayer(): PlayerInstance | undefined {
    // Find a ready player with no video loaded
    for (const player of this.players.values()) {
      if (player.status === 'ready' && !player.videoId) {
        return player;
      }
    }

    // Find a ready player with a video (least recently used)
    let lruPlayer: PlayerInstance | undefined;
    let lruTime = Infinity;

    for (const player of this.players.values()) {
      if (player.status === 'ready' && player.lastUsed < lruTime) {
        lruPlayer = player;
        lruTime = player.lastUsed;
      }
    }

    return lruPlayer;
  }

  /**
   * Get a player by ID
   */
  getPlayer(playerId: string): PlayerInstance | null {
    return this.players.get(playerId) || null;
  }

  /**
   * Get a player that has a specific video loaded
   */
  getPlayerByVideoId(videoId: string): PlayerInstance | null {
    for (const player of this.players.values()) {
      if (player.videoId === videoId) {
        return player;
      }
    }
    return null;
  }

  /**
   * Play a video in a player
   */
  play(playerId: string): void {
    const player = this.players.get(playerId);
    if (player && player.player) {
      player.player.playVideo();
    }
  }

  /**
   * Pause a video in a player
   */
  pause(playerId: string): void {
    const player = this.players.get(playerId);
    if (player && player.player) {
      player.player.pauseVideo();
    }
  }

  /**
   * Stop a video in a player
   */
  stop(playerId: string): void {
    const player = this.players.get(playerId);
    if (player && player.player) {
      player.player.stopVideo();
    }
  }

  /**
   * Seek to a specific time
   */
  seekTo(playerId: string, seconds: number, allowSeekAhead: boolean = true): void {
    const player = this.players.get(playerId);
    if (player && player.player) {
      player.player.seekTo(seconds, allowSeekAhead);
    }
  }

  /**
   * Get current time
   */
  getCurrentTime(playerId: string): number {
    const player = this.players.get(playerId);
    if (player && player.player) {
      try {
        return player.player.getCurrentTime();
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Get video duration
   */
  getDuration(playerId: string): number {
    const player = this.players.get(playerId);
    if (player && player.player) {
      try {
        return player.player.getDuration();
      } catch {
        return 0;
      }
    }
    return 0;
  }

  /**
   * Set volume for a player
   */
  setVolume(playerId: string, volume: number): void {
    const player = this.players.get(playerId);
    if (player && player.player) {
      player.player.setVolume(Math.max(0, Math.min(100, volume)));
    }
  }

  /**
   * Set playback rate
   */
  setPlaybackRate(playerId: string, rate: number): void {
    const player = this.players.get(playerId);
    if (player && player.player) {
      player.player.setPlaybackRate(rate);
    }
  }

  /**
   * Queue a video for prebuffering
   */
  queueVideo(video: QueuedVideo): void {
    this.videoQueue.push(video);
    this.processQueue();
  }

  /**
   * Process the video queue
   */
  private processQueue(): void {
    if (this.videoQueue.length === 0) {
      return;
    }

    // Sort queue by priority and playAt time
    this.videoQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return (b.priority || 0) - (a.priority || 0);
      }
      if (a.playAt !== b.playAt) {
        return (a.playAt || Infinity) - (b.playAt || Infinity);
      }
      return 0;
    });

    // Load videos that need prebuffering
    const now = Date.now();
    const toLoad = this.videoQueue.filter(video => {
      if (!video.playAt) return true;
      return (video.playAt - now) <= this.prebufferTime * 1000;
    });

    toLoad.forEach(video => {
      // Check if already loaded
      const existingPlayer = this.getPlayerByVideoId(video.videoId);
      if (!existingPlayer) {
        this.loadVideo(video.videoId, {
          autoplay: false,
          layerId: video.layerId,
        });
      }
    });

    // Remove loaded videos from queue
    this.videoQueue = this.videoQueue.filter(v => !toLoad.includes(v));
  }

  /**
   * Get all players status
   */
  getPoolStatus(): {
    total: number;
    ready: number;
    loading: number;
    playing: number;
    buffering: number;
    paused: number;
  } {
    const status = {
      total: this.players.size,
      ready: 0,
      loading: 0,
      playing: 0,
      buffering: 0,
      paused: 0,
    };

    for (const player of this.players.values()) {
      switch (player.status) {
        case 'ready':
          status.ready++;
          break;
        case 'loading':
          status.loading++;
          break;
        case 'playing':
          status.playing++;
          break;
        case 'buffering':
          status.buffering++;
          break;
        case 'paused':
          status.paused++;
          break;
      }
    }

    return status;
  }

  /**
   * Register callback for state changes
   */
  onStateChange(callback: PlayerStateChangeCallback): () => void {
    this.onStateChangeCallbacks.push(callback);
    return () => {
      this.onStateChangeCallbacks = this.onStateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register callback for player ready
   */
  onReady(callback: PlayerReadyCallback): () => void {
    this.onReadyCallbacks.push(callback);
    return () => {
      this.onReadyCallbacks = this.onReadyCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Register callback for errors
   */
  onError(callback: PlayerErrorCallback): () => void {
    this.onErrorCallbacks.push(callback);
    return () => {
      this.onErrorCallbacks = this.onErrorCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Cleanup and destroy the pool
   */
  destroy(): void {
    // Clean up all players
    for (const player of this.players.values()) {
      if (player.capture) {
        player.capture.cleanup();
      }
      if (player.player) {
        player.player.destroy();
      }
      if (player.element) {
        player.element.remove();
      }
    }

    this.players.clear();
    this.videoQueue = [];
    this.onStateChangeCallbacks = [];
    this.onReadyCallbacks = [];
    this.onErrorCallbacks = [];

    if (this.container && this.container.parentNode) {
      this.container.remove();
    }

    this.isInitialized = false;
  }

  /**
   * Get all player instances
   */
  getAllPlayers(): PlayerInstance[] {
    return Array.from(this.players.values());
  }
}

// Singleton instance
let globalPlayerPool: YouTubePlayerPool | null = null;

/**
 * Get or create global player pool instance
 */
export function getPlayerPool(config?: PlayerPoolConfig): YouTubePlayerPool {
  if (!globalPlayerPool) {
    globalPlayerPool = new YouTubePlayerPool(config);
  }
  return globalPlayerPool;
}

/**
 * Destroy global player pool
 */
export function destroyPlayerPool(): void {
  if (globalPlayerPool) {
    globalPlayerPool.destroy();
    globalPlayerPool = null;
  }
}
