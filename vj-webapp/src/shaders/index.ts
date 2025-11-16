/**
 * Shader System Index
 *
 * Exports all shaders, materials, and compositors for the VJ webapp.
 *
 * @example Basic Usage
 * ```typescript
 * import { EffectComposer, LayerCompositor } from './shaders';
 *
 * // Create effect composer
 * const composer = new EffectComposer(renderer, width, height);
 *
 * // Add effects
 * await composer.addEffect({
 *   id: 'blur-1',
 *   type: 'blur',
 *   enabled: true,
 *   parameters: { amount: 0.5 }
 * });
 *
 * // Render with effects
 * composer.render(inputTexture, outputTarget, deltaTime);
 * ```
 *
 * @example Layer Compositing
 * ```typescript
 * import { LayerCompositor } from './shaders';
 *
 * const compositor = new LayerCompositor(renderer, width, height);
 *
 * // Blend two layers
 * const result = compositor.composite(
 *   layer1Texture,
 *   layer2Texture,
 *   'screen',
 *   0.8
 * );
 * ```
 */

// Blend modes
export * from './blendModes.glsl';

// Shader material helpers
export * from './ShaderMaterial';

// Effect composer
export { default as EffectComposer, LayerCompositor } from './EffectComposer';

// Re-export effect shaders for direct access
export * as BlurShader from './effects/blur.glsl';
export * as BrightnessShader from './effects/brightness.glsl';
export * as ContrastShader from './effects/contrast.glsl';
export * as SaturationShader from './effects/saturation.glsl';
export * as HueShader from './effects/hue.glsl';
export * as PixelateShader from './effects/pixelate.glsl';
export * as KaleidoscopeShader from './effects/kaleidoscope.glsl';
export * as MirrorShader from './effects/mirror.glsl';
export * as EdgeDetectShader from './effects/edgeDetect.glsl';
export * as PosterizeShader from './effects/posterize.glsl';
export * as GlitchShader from './effects/glitch.glsl';
export * as ChromakeyShader from './effects/chromakey.glsl';
export * as FeedbackShader from './effects/feedback.glsl';
export * as RgbShiftShader from './effects/rgbShift.glsl';
export * as VhsShader from './effects/vhs.glsl';
export * as CrtShader from './effects/crt.glsl';
export * as BloomShader from './effects/bloom.glsl';
