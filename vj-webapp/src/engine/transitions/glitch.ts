/**
 * Glitch Transition
 *
 * Digital glitch effect with RGB shift, displacement, and noise
 */

import { clamp } from '../../utils/easing';

export interface GlitchParams {
  intensity?: number; // Overall glitch intensity (0-1)
  blockSize?: number; // Size of glitch blocks (0-1)
  rgbShift?: number; // RGB channel separation (0-1)
  displacement?: number; // Horizontal displacement amount (0-1)
  noiseAmount?: number; // Digital noise amount (0-1)
}

/**
 * Apply glitch transition
 */
export const applyGlitch = (
  progress: number,
  params: GlitchParams = {}
): {
  progress: number;
  intensity: number;
  blockSize: number;
  rgbShift: number;
  displacement: number;
  noiseAmount: number;
  seed: number;
} => {
  const {
    intensity = 0.8,
    blockSize = 0.05,
    rgbShift = 0.03,
    displacement = 0.1,
    noiseAmount = 0.3,
  } = params;

  const p = clamp(progress, 0, 1);

  // Glitch intensity peaks in the middle of transition
  const glitchCurve = Math.sin(p * Math.PI);
  const currentIntensity = intensity * glitchCurve;

  // Random seed that changes during transition
  const seed = Math.floor(p * 100);

  return {
    progress: p,
    intensity: currentIntensity,
    blockSize: clamp(blockSize, 0.01, 1),
    rgbShift: clamp(rgbShift, 0, 1) * currentIntensity,
    displacement: clamp(displacement, 0, 1) * currentIntensity,
    noiseAmount: clamp(noiseAmount, 0, 1) * currentIntensity,
    seed,
  };
};

/**
 * Generate glitch shader uniforms
 */
export const getGlitchUniforms = (
  progress: number,
  params: GlitchParams = {}
): Record<string, number> => {
  const glitchData = applyGlitch(progress, params);

  return {
    u_progress: glitchData.progress,
    u_intensity: glitchData.intensity,
    u_blockSize: glitchData.blockSize,
    u_rgbShift: glitchData.rgbShift,
    u_displacement: glitchData.displacement,
    u_noiseAmount: glitchData.noiseAmount,
    u_seed: glitchData.seed,
    u_time: Date.now() * 0.001,
  };
};

/**
 * Glitch transition shader code
 */
export const glitchShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_intensity;
  uniform float u_blockSize;
  uniform float u_rgbShift;
  uniform float u_displacement;
  uniform float u_noiseAmount;
  uniform float u_seed;
  uniform float u_time;

  varying vec2 v_texCoord;

  // Pseudo-random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233)) + u_seed) * 43758.5453123);
  }

  // Random block offset
  float randomBlock(vec2 st, float size) {
    vec2 blockPos = floor(st / size);
    return random(blockPos);
  }

  void main() {
    vec2 uv = v_texCoord;

    // Block-based displacement
    float blockRand = randomBlock(uv, u_blockSize);
    float displace = (blockRand - 0.5) * u_displacement;

    // Apply displacement to UV
    vec2 displacedUV = uv;
    displacedUV.x += displace * step(0.5, blockRand);

    // RGB shift for glitch effect
    vec2 uvR = displacedUV + vec2(u_rgbShift, 0.0);
    vec2 uvG = displacedUV;
    vec2 uvB = displacedUV - vec2(u_rgbShift, 0.0);

    // Sample source with RGB shift
    float sourceR = texture2D(u_sourceTexture, uvR).r;
    float sourceG = texture2D(u_sourceTexture, uvG).g;
    float sourceB = texture2D(u_sourceTexture, uvB).b;
    vec4 sourceColor = vec4(sourceR, sourceG, sourceB, 1.0);

    // Sample target with RGB shift
    float targetR = texture2D(u_targetTexture, uvR).r;
    float targetG = texture2D(u_targetTexture, uvG).g;
    float targetB = texture2D(u_targetTexture, uvB).b;
    vec4 targetColor = vec4(targetR, targetG, targetB, 1.0);

    // Mix between source and target
    vec4 mixedColor = mix(sourceColor, targetColor, u_progress);

    // Add digital noise
    float noise = random(uv * 100.0 + u_time) * u_noiseAmount;
    mixedColor.rgb += noise * 0.5 - 0.25;

    // Random line glitches
    float lineGlitch = step(0.98, random(vec2(uv.y * 100.0, u_time)));
    if (lineGlitch > 0.5) {
      float shift = (random(vec2(uv.y, u_time)) - 0.5) * u_displacement * 2.0;
      mixedColor = texture2D(u_targetTexture, vec2(uv.x + shift, uv.y));
    }

    // Random block color inversions
    if (blockRand > 0.9 && u_intensity > 0.3) {
      mixedColor.rgb = 1.0 - mixedColor.rgb;
    }

    gl_FragColor = mixedColor;
  }
`;
