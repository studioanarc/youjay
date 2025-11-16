/**
 * Effect Composer
 *
 * Chains multiple shader effects together for real-time rendering.
 * Manages render targets, ping-pong buffers, and effect passes.
 */

import * as THREE from 'three';
import type { Effect, EffectType } from '../types';
import {
  createRenderTarget,
  createEffectScene,
  createEffectPlane,
  createEffectMaterial,
  loadEffectShader,
  updateUniforms,
  disposeShaderMaterial,
} from './ShaderMaterial';
import { blendModeShaders, blendVertexShader } from './blendModes.glsl';

// Effect pass in the composition chain
interface EffectPass {
  id: string;
  type: EffectType;
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
  enabled: boolean;
  parameters: Record<string, number>;
}

/**
 * Effect Composer class for chaining shader effects
 */
export class EffectComposer {
  private renderer: THREE.WebGLRenderer;
  private width: number;
  private height: number;

  // Render targets for ping-pong rendering
  private readBuffer: THREE.WebGLRenderTarget;
  private writeBuffer: THREE.WebGLRenderTarget;

  // Effect scene and camera
  private effectScene: THREE.Scene;
  private effectCamera: THREE.OrthographicCamera;

  // Effect passes
  private passes: EffectPass[] = [];

  // Time uniform for animated effects
  private time: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number
  ) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;

    // Create ping-pong render targets
    this.readBuffer = createRenderTarget(width, height);
    this.writeBuffer = createRenderTarget(width, height);

    // Create effect rendering scene
    const { scene, camera } = createEffectScene();
    this.effectScene = scene;
    this.effectCamera = camera;
  }

  /**
   * Add an effect to the composition chain
   */
  async addEffect(effect: Effect): Promise<void> {
    const shader = await loadEffectShader(effect.type);
    if (!shader) {
      console.warn(`Failed to load shader for effect: ${effect.type}`);
      return;
    }

    // Create material with default uniforms
    const material = createEffectMaterial(shader, {
      resolution: [this.width, this.height],
      time: this.time,
      ...effect.parameters,
    });

    // Create plane mesh
    const mesh = createEffectPlane(material);

    // Add pass
    const pass: EffectPass = {
      id: effect.id,
      type: effect.type,
      material,
      mesh,
      enabled: effect.enabled,
      parameters: effect.parameters,
    };

    this.passes.push(pass);
  }

  /**
   * Remove an effect by ID
   */
  removeEffect(effectId: string): void {
    const index = this.passes.findIndex((pass) => pass.id === effectId);
    if (index !== -1) {
      const pass = this.passes[index];
      disposeShaderMaterial(pass.material);
      pass.mesh.geometry.dispose();
      this.passes.splice(index, 1);
    }
  }

  /**
   * Update effect parameters
   */
  updateEffect(effectId: string, parameters: Record<string, number>): void {
    const pass = this.passes.find((p) => p.id === effectId);
    if (pass) {
      pass.parameters = { ...pass.parameters, ...parameters };
      updateUniforms(pass.material, parameters);
    }
  }

  /**
   * Enable or disable an effect
   */
  setEffectEnabled(effectId: string, enabled: boolean): void {
    const pass = this.passes.find((p) => p.id === effectId);
    if (pass) {
      pass.enabled = enabled;
    }
  }

  /**
   * Clear all effects
   */
  clearEffects(): void {
    for (const pass of this.passes) {
      disposeShaderMaterial(pass.material);
      pass.mesh.geometry.dispose();
    }
    this.passes = [];
  }

  /**
   * Render the effect chain
   */
  render(
    inputTexture: THREE.Texture,
    outputTarget?: THREE.WebGLRenderTarget | null,
    deltaTime: number = 0
  ): void {
    // Update time
    this.time += deltaTime;

    // If no effects are enabled, just copy input to output
    const enabledPasses = this.passes.filter((pass) => pass.enabled);
    if (enabledPasses.length === 0) {
      if (outputTarget) {
        this.renderer.setRenderTarget(outputTarget);
        this.renderer.clear();
        // Could render input texture directly here if needed
      }
      return;
    }

    // Setup initial state
    let currentInput = inputTexture;

    // Process each enabled effect
    for (let i = 0; i < enabledPasses.length; i++) {
      const pass = enabledPasses[i];
      const isLastPass = i === enabledPasses.length - 1;

      // Update material uniforms
      updateUniforms(pass.material, {
        tDiffuse: currentInput,
        time: this.time,
        resolution: [this.width, this.height],
        ...pass.parameters,
      });

      // Clear effect scene
      this.effectScene.clear();
      this.effectScene.add(pass.mesh);

      // Determine output target
      const target = isLastPass && outputTarget !== undefined
        ? outputTarget
        : this.writeBuffer;

      // Render effect
      this.renderer.setRenderTarget(target);
      this.renderer.clear();
      this.renderer.render(this.effectScene, this.effectCamera);

      // Swap buffers for next pass
      if (!isLastPass) {
        currentInput = this.writeBuffer.texture;
        this.swapBuffers();
      }
    }

    // Reset render target
    this.renderer.setRenderTarget(null);
  }

  /**
   * Swap read and write buffers
   */
  private swapBuffers(): void {
    const temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
  }

  /**
   * Resize render targets
   */
  setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Dispose old render targets
    this.readBuffer.dispose();
    this.writeBuffer.dispose();

    // Create new render targets
    this.readBuffer = createRenderTarget(width, height);
    this.writeBuffer = createRenderTarget(width, height);

    // Update resolution uniform for all passes
    for (const pass of this.passes) {
      updateUniforms(pass.material, {
        resolution: [width, height],
      });
    }
  }

  /**
   * Get current output texture
   */
  getOutputTexture(): THREE.Texture {
    return this.readBuffer.texture;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearEffects();
    this.readBuffer.dispose();
    this.writeBuffer.dispose();
  }
}

/**
 * Layer Compositor - Combines multiple layers with blend modes
 */
export class LayerCompositor {
  private renderer: THREE.WebGLRenderer;

  private compositeScene: THREE.Scene;
  private compositeCamera: THREE.OrthographicCamera;
  private renderTarget: THREE.WebGLRenderTarget;

  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number
  ) {
    this.renderer = renderer;

    const { scene, camera } = createEffectScene();
    this.compositeScene = scene;
    this.compositeCamera = camera;

    this.renderTarget = createRenderTarget(width, height);
  }

  /**
   * Composite two layers with a blend mode
   */
  composite(
    baseTexture: THREE.Texture,
    blendTexture: THREE.Texture,
    blendMode: string,
    opacity: number = 1.0,
    outputTarget?: THREE.WebGLRenderTarget | null
  ): THREE.Texture {
    // Get blend shader
    const fragmentShader = blendModeShaders[blendMode as keyof typeof blendModeShaders];
    if (!fragmentShader) {
      console.warn(`Unknown blend mode: ${blendMode}`);
      return baseTexture;
    }

    // Create material
    const material = new THREE.ShaderMaterial({
      vertexShader: blendVertexShader,
      fragmentShader,
      uniforms: {
        baseTexture: { value: baseTexture },
        blendTexture: { value: blendTexture },
        opacity: { value: opacity },
      },
      transparent: true,
    });

    // Create mesh
    const mesh = createEffectPlane(material);

    // Render
    this.compositeScene.clear();
    this.compositeScene.add(mesh);

    const target = outputTarget !== undefined ? outputTarget : this.renderTarget;
    this.renderer.setRenderTarget(target);
    this.renderer.clear();
    this.renderer.render(this.compositeScene, this.compositeCamera);
    this.renderer.setRenderTarget(null);

    // Cleanup
    material.dispose();
    mesh.geometry.dispose();

    return target ? target.texture : this.renderTarget.texture;
  }

  /**
   * Resize compositor
   */
  setSize(width: number, height: number): void {
    this.renderTarget.dispose();
    this.renderTarget = createRenderTarget(width, height);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.renderTarget.dispose();
  }
}

export default EffectComposer;
