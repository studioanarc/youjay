import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { VideoLayer } from '../types';
import { RenderPipeline } from './RenderPipeline';

interface VideoPlaneProps {
  layer: VideoLayer;
  videoElement: HTMLVideoElement | null;
  renderPipeline: RenderPipeline;
  masterOpacity: number;
}

/**
 * VideoPlane component renders a single video layer as a textured plane
 * Supports video textures, blend modes, opacity, and effects
 */
export const VideoPlane: React.FC<VideoPlaneProps> = ({
  layer,
  videoElement,
  renderPipeline,
  masterOpacity,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const timeRef = useRef<number>(0);

  // Create video texture from video element
  const videoTexture = useMemo(() => {
    if (!videoElement) return null;

    const texture = new THREE.VideoTexture(videoElement);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.colorSpace = THREE.SRGBColorSpace;

    videoTextureRef.current = texture;

    return texture;
  }, [videoElement]);

  // Create material with blend mode
  const material = useMemo(() => {
    if (!videoTexture) return null;

    const mat = renderPipeline.createBlendedMaterial(
      videoTexture,
      layer.blendMode,
      layer.opacity * masterOpacity
    );

    materialRef.current = mat;

    return mat;
  }, [videoTexture, layer.blendMode, renderPipeline, layer.opacity, masterOpacity]);

  // Update material opacity when it changes
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.opacity.value = layer.opacity * masterOpacity;
    }
  }, [layer.opacity, masterOpacity]);

  // Update material blend mode when it changes
  useEffect(() => {
    if (!videoTexture || !materialRef.current) return;

    const newMaterial = renderPipeline.createBlendedMaterial(
      videoTexture,
      layer.blendMode,
      layer.opacity * masterOpacity
    );

    // Dispose old material
    if (materialRef.current) {
      materialRef.current.dispose();
    }

    materialRef.current = newMaterial;

    if (meshRef.current) {
      meshRef.current.material = newMaterial;
    }
  }, [layer.blendMode, videoTexture, renderPipeline, layer.opacity, masterOpacity]);

  // Update video texture and apply effects on each frame
  useFrame((_state, delta) => {
    if (!layer.visible || !materialRef.current) return;

    timeRef.current += delta;

    // Update video texture
    if (videoTextureRef.current && videoElement && !videoElement.paused) {
      videoTextureRef.current.needsUpdate = true;
    }

    // Apply effects
    if (layer.effects.length > 0) {
      renderPipeline.applyEffects(materialRef.current, layer.effects, timeRef.current);
    }

    // Update material uniforms
    if (materialRef.current.uniforms.time) {
      materialRef.current.uniforms.time.value = timeRef.current;
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
      }
      if (materialRef.current) {
        materialRef.current.dispose();
      }
    };
  }, []);

  // Don't render if layer is not visible or has no material
  if (!layer.visible || !material) {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, layer.zIndex * 0.001]} // Use zIndex for depth ordering
      material={material}
    >
      {/* Plane geometry with aspect ratio that fills the viewport */}
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

export default VideoPlane;
