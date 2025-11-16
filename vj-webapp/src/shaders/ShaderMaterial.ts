/**
 * Shader Material Helper
 *
 * Utilities for creating Three.js ShaderMaterial instances with custom uniforms.
 * Provides type-safe uniform creation and management for effect shaders.
 */

import * as THREE from 'three';
import type { ShaderUniform } from '../types';

// Effect shader definition
export interface EffectShader {
  vertexShader: string;
  fragmentShader: string;
  defaultUniforms: Record<string, any>;
}

/**
 * Create a Three.js uniform from a shader uniform definition
 */
export function createUniform(uniform: ShaderUniform): THREE.IUniform {
  return { value: uniform.value };
}

/**
 * Create a Three.js ShaderMaterial from shader code and uniforms
 */
export function createShaderMaterial(
  vertexShader: string,
  fragmentShader: string,
  uniforms: Record<string, any> = {},
  options: Partial<THREE.ShaderMaterialParameters> = {}
): THREE.ShaderMaterial {
  // Convert uniforms to Three.js format
  const threeUniforms: Record<string, THREE.IUniform> = {};

  for (const key in uniforms) {
    if (uniforms[key]?.value !== undefined) {
      threeUniforms[key] = { value: uniforms[key].value };
    } else {
      threeUniforms[key] = { value: uniforms[key] };
    }
  }

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: threeUniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    ...options,
  });
}

/**
 * Create a ShaderMaterial from an EffectShader definition
 */
export function createEffectMaterial(
  shader: EffectShader,
  customUniforms: Record<string, any> = {},
  options: Partial<THREE.ShaderMaterialParameters> = {}
): THREE.ShaderMaterial {
  // Merge default uniforms with custom uniforms
  const uniforms = { ...shader.defaultUniforms, ...customUniforms };

  return createShaderMaterial(
    shader.vertexShader,
    shader.fragmentShader,
    uniforms,
    options
  );
}

/**
 * Update a shader uniform value
 */
export function updateUniform(
  material: THREE.ShaderMaterial,
  name: string,
  value: any
): void {
  if (material.uniforms[name]) {
    material.uniforms[name].value = value;
  }
}

/**
 * Update multiple shader uniforms
 */
export function updateUniforms(
  material: THREE.ShaderMaterial,
  uniforms: Record<string, any>
): void {
  for (const name in uniforms) {
    updateUniform(material, name, uniforms[name]);
  }
}

/**
 * Create a plane mesh with a shader material for full-screen effects
 */
export function createEffectPlane(
  material: THREE.ShaderMaterial,
  width: number = 2,
  height: number = 2
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, material);

  // Position for orthographic camera rendering
  mesh.position.z = 0;

  return mesh;
}

/**
 * Create an orthographic scene and camera for full-screen shader effects
 */
export function createEffectScene(): {
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
} {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return { scene, camera };
}

/**
 * Load all effect shaders dynamically
 */
export async function loadEffectShader(
  effectType: string
): Promise<EffectShader | null> {
  try {
    const module = await import(`./effects/${effectType}.glsl.ts`);
    return {
      vertexShader: module.vertexShader,
      fragmentShader: module.fragmentShader,
      defaultUniforms: module.defaultUniforms,
    };
  } catch (error) {
    console.error(`Failed to load effect shader: ${effectType}`, error);
    return null;
  }
}

/**
 * Create render target for off-screen rendering
 */
export function createRenderTarget(
  width: number,
  height: number,
  options: THREE.RenderTargetOptions = {}
): THREE.WebGLRenderTarget {
  return new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    stencilBuffer: false,
    ...options,
  });
}

/**
 * Clone a shader material with its uniforms
 */
export function cloneShaderMaterial(
  material: THREE.ShaderMaterial
): THREE.ShaderMaterial {
  const clonedUniforms: Record<string, THREE.IUniform> = {};

  for (const key in material.uniforms) {
    clonedUniforms[key] = { value: material.uniforms[key].value };
  }

  return new THREE.ShaderMaterial({
    vertexShader: material.vertexShader,
    fragmentShader: material.fragmentShader,
    uniforms: clonedUniforms,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
    depthTest: material.depthTest,
    side: material.side,
    blending: material.blending,
  });
}

/**
 * Dispose of shader material and its resources
 */
export function disposeShaderMaterial(material: THREE.ShaderMaterial): void {
  // Dispose textures in uniforms
  for (const key in material.uniforms) {
    const uniform = material.uniforms[key];
    if (uniform.value instanceof THREE.Texture) {
      uniform.value.dispose();
    }
  }

  material.dispose();
}
