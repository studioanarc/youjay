import { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useVJStore } from '../store';
import { VideoPlane } from './VideoPlane';
import { RenderPipeline } from './RenderPipeline';
import { useAnimationLoop } from './useAnimationLoop';

/**
 * Scene component that sets up the camera and renders video layers
 */
const Scene: React.FC<{
  renderPipeline: RenderPipeline;
  videoElements: Map<string, HTMLVideoElement>;
}> = ({ renderPipeline, videoElements }) => {
  const { gl, scene, camera } = useThree();
  const layers = useVJStore((state) => state.layers);
  const masterOpacity = useVJStore((state) => state.masterOpacity);

  // Initialize render pipeline
  useEffect(() => {
    if (camera instanceof THREE.OrthographicCamera) {
      renderPipeline.init(gl, scene, camera);
    }
  }, [gl, scene, camera, renderPipeline]);

  // Sort layers by zIndex for proper compositing order
  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => a.zIndex - b.zIndex);
  }, [layers]);

  return (
    <>
      {sortedLayers.map((layer) => (
        <VideoPlane
          key={layer.id}
          layer={layer}
          videoElement={videoElements.get(layer.id) || null}
          renderPipeline={renderPipeline}
          masterOpacity={masterOpacity}
        />
      ))}
    </>
  );
};

/**
 * Main VideoCompositor component that renders multiple video layers with WebGL
 * This is the core rendering engine for the VJ webapp
 */
export const VideoCompositor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fps, setFps] = useState<number>(60);

  // Create render pipeline instance
  const renderPipeline = useMemo(() => new RenderPipeline(), []);

  // Store for video elements (keyed by layer ID)
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  const layers = useVJStore((state) => state.layers);
  const isPlaying = useVJStore((state) => state.isPlaying);

  // Create and manage video elements for each layer
  useEffect(() => {
    const videoElements = videoElementsRef.current;

    // Add new video elements for new layers
    layers.forEach((layer) => {
      if (!videoElements.has(layer.id)) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.loop = layer.loop;
        video.muted = layer.volume === 0;
        video.playbackRate = layer.speed;
        video.volume = layer.volume;
        video.style.display = 'none';
        document.body.appendChild(video);

        // Load video source if available
        if (layer.localFile) {
          video.src = URL.createObjectURL(layer.localFile);
        } else if (layer.youtubeUrl) {
          // YouTube videos will be handled separately via iframe API
          // For now, we'll leave this empty
        }

        videoElements.set(layer.id, video);
      } else {
        // Update existing video element properties
        const video = videoElements.get(layer.id)!;
        video.loop = layer.loop;
        video.muted = layer.volume === 0;
        video.playbackRate = layer.speed;
        video.volume = layer.volume;
      }
    });

    // Remove video elements for deleted layers
    const currentLayerIds = new Set(layers.map((l) => l.id));
    videoElements.forEach((video, layerId) => {
      if (!currentLayerIds.has(layerId)) {
        video.pause();
        video.remove();
        if (video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src);
        }
        videoElements.delete(layerId);
      }
    });
  }, [layers]);

  // Play/pause video elements based on global play state
  useEffect(() => {
    const videoElements = videoElementsRef.current;

    videoElements.forEach((video) => {
      if (isPlaying && video.readyState >= 2) {
        video.play().catch((err) => {
          console.warn('Failed to play video:', err);
        });
      } else {
        video.pause();
      }
    });
  }, [isPlaying]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // Dimensions updated
      renderPipeline.resize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderPipeline]);

  // Animation loop for performance monitoring
  useAnimationLoop(
    {
      onFpsUpdate: (currentFps) => {
        setFps(currentFps);
      },
    },
    {
      enabled: isPlaying,
      targetFps: 60,
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup video elements
      videoElementsRef.current.forEach((video) => {
        video.pause();
        video.remove();
        if (video.src.startsWith('blob:')) {
          URL.revokeObjectURL(video.src);
        }
      });
      videoElementsRef.current.clear();

      // Cleanup render pipeline
      renderPipeline.dispose();
    };
  }, [renderPipeline]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#000',
      }}
    >
      <Canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
        camera={{
          position: [0, 0, 5],
          near: 0.1,
          far: 1000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true, // Needed for recording/screenshots
        }}
        dpr={Math.min(window.devicePixelRatio, 2)} // Limit pixel ratio for performance
        orthographic
      >
        <Scene
          renderPipeline={renderPipeline}
          videoElements={videoElementsRef.current}
        />
      </Canvas>

      {/* FPS Counter (for development/debugging) */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#0f0',
          padding: '5px 10px',
          fontFamily: 'monospace',
          fontSize: '12px',
          borderRadius: '3px',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        {fps} FPS
      </div>
    </div>
  );
};

export default VideoCompositor;
