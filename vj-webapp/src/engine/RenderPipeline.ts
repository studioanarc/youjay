import * as THREE from 'three';
import type { BlendMode, Effect } from '../types';

/**
 * Core rendering pipeline that applies effects and blend modes using WebGL shaders
 */
export class RenderPipeline {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;

  constructor() {
    // Constructor kept minimal, initialization happens in init()
  }

  /**
   * Initialize the render pipeline with a WebGL renderer
   */
  init(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.OrthographicCamera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Configure renderer for optimal performance
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.autoClear = false;
  }

  /**
   * Get the appropriate THREE.js blend mode for a given blend mode string
   */
  getBlendMode(blendMode: BlendMode): {
    blending: THREE.Blending;
    blendEquation: THREE.BlendingEquation;
    blendSrc: THREE.BlendingSrcFactor;
    blendDst: THREE.BlendingDstFactor;
  } {
    switch (blendMode) {
      case 'normal':
        return {
          blending: THREE.NormalBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        };

      case 'add':
        return {
          blending: THREE.AdditiveBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneFactor,
        };

      case 'multiply':
        return {
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.DstColorFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        };

      case 'screen':
        return {
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.OneMinusDstColorFactor,
          blendDst: THREE.OneFactor,
        };

      case 'subtract':
        return {
          blending: THREE.SubtractiveBlending,
          blendEquation: THREE.ReverseSubtractEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneFactor,
        };

      case 'lighten':
        return {
          blending: THREE.CustomBlending,
          blendEquation: THREE.MaxEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        };

      case 'darken':
        return {
          blending: THREE.CustomBlending,
          blendEquation: THREE.MinEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        };

      // For more complex blend modes, we'll use custom shaders in the material
      case 'overlay':
      case 'difference':
      case 'color-dodge':
      case 'color-burn':
        return {
          blending: THREE.CustomBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        };

      default:
        return {
          blending: THREE.NormalBlending,
          blendEquation: THREE.AddEquation,
          blendSrc: THREE.SrcAlphaFactor,
          blendDst: THREE.OneMinusSrcAlphaFactor,
        };
    }
  }

  /**
   * Create a shader material with the specified blend mode
   */
  createBlendedMaterial(
    texture: THREE.Texture,
    blendMode: BlendMode,
    opacity: number
  ): THREE.ShaderMaterial {
    const blendSettings = this.getBlendMode(blendMode);

    // Custom shader for advanced blend modes
    const vertexShader = `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = this.getFragmentShader(blendMode);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        opacity: { value: opacity },
        time: { value: 0.0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      ...blendSettings,
    });

    return material;
  }

  /**
   * Get fragment shader code for specific blend modes
   */
  private getFragmentShader(blendMode: BlendMode): string {
    const baseShader = `
      uniform sampler2D tDiffuse;
      uniform float opacity;
      uniform float time;
      varying vec2 vUv;
    `;

    switch (blendMode) {
      case 'overlay':
        return baseShader + `
          vec3 overlay(vec3 base, vec3 blend) {
            return mix(
              2.0 * base * blend,
              1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
              step(0.5, base)
            );
          }

          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            // For overlay, we'd need the background color, so we'll just output the texture
            gl_FragColor = vec4(texel.rgb, texel.a * opacity);
          }
        `;

      case 'difference':
        return baseShader + `
          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            gl_FragColor = vec4(texel.rgb, texel.a * opacity);
          }
        `;

      case 'color-dodge':
        return baseShader + `
          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            gl_FragColor = vec4(texel.rgb, texel.a * opacity);
          }
        `;

      case 'color-burn':
        return baseShader + `
          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            gl_FragColor = vec4(texel.rgb, texel.a * opacity);
          }
        `;

      default:
        return baseShader + `
          void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            gl_FragColor = vec4(texel.rgb, texel.a * opacity);
          }
        `;
    }
  }

  /**
   * Apply effects to a layer's material
   */
  applyEffects(material: THREE.ShaderMaterial, effects: Effect[], time: number) {
    // Update time uniform for animated effects
    if (material.uniforms.time) {
      material.uniforms.time.value = time;
    }

    // Apply individual effects
    effects.forEach((effect) => {
      if (!effect.enabled) return;

      switch (effect.type) {
        case 'brightness':
          // Effects will be applied via shader uniforms
          break;
        case 'contrast':
          break;
        case 'saturation':
          break;
        // Add more effect cases as needed
      }
    });
  }

  /**
   * Render a single frame
   */
  render(_masterOpacity: number = 1) {
    if (!this.renderer || !this.scene || !this.camera) {
      console.warn('RenderPipeline not initialized');
      return;
    }

    // Clear the canvas
    this.renderer.clear();

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number) {
    if (!this.renderer || !this.camera) return;

    this.renderer.setSize(width, height);

    // Update orthographic camera
    const aspect = width / height;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 1;
    this.camera.bottom = -1;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Dispose of resources
   */
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}

export default RenderPipeline;
