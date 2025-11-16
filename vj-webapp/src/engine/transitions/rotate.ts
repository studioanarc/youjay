/**
 * Rotate Transition
 *
 * Rotational transition effect
 */

import { clamp } from '../../utils/easing';

export interface RotateParams {
  angle?: number; // Total rotation in degrees (default: 360)
  clockwise?: boolean; // Rotation direction
  scale?: number; // Scale during rotation (0-1, default: 0.8)
  blur?: number; // Motion blur amount (0-1)
}

/**
 * Apply rotate transition
 */
export const applyRotate = (
  progress: number,
  params: RotateParams = {}
): {
  progress: number;
  rotation: number; // In radians
  scale: number;
  opacity: number;
  blur: number;
} => {
  const {
    angle = 360,
    clockwise = true,
    scale = 0.8,
    blur = 0.2,
  } = params;

  const p = clamp(progress, 0, 1);

  // Calculate rotation
  const rotationDegrees = angle * p * (clockwise ? 1 : -1);
  const rotation = (rotationDegrees * Math.PI) / 180;

  // Scale down during transition, back to normal at end
  const transitionScale = 1 - (1 - scale) * Math.sin(p * Math.PI);

  // Fade slightly during rotation
  const opacity = 1 - 0.3 * Math.sin(p * Math.PI);

  // Motion blur peaks in the middle
  const motionBlur = clamp(blur, 0, 1) * Math.sin(p * Math.PI);

  return {
    progress: p,
    rotation,
    scale: transitionScale,
    opacity,
    blur: motionBlur,
  };
};

/**
 * Generate rotate shader uniforms
 */
export const getRotateUniforms = (
  progress: number,
  params: RotateParams = {}
): Record<string, number> => {
  const rotateData = applyRotate(progress, params);

  return {
    u_progress: rotateData.progress,
    u_rotation: rotateData.rotation,
    u_scale: rotateData.scale,
    u_opacity: rotateData.opacity,
    u_blur: rotateData.blur,
  };
};

/**
 * Rotate transition shader code
 */
export const rotateShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_rotation;
  uniform float u_scale;
  uniform float u_blur;

  varying vec2 v_texCoord;

  vec2 rotate(vec2 uv, float angle, vec2 center) {
    vec2 offset = uv - center;
    float c = cos(angle);
    float s = sin(angle);
    mat2 rotationMatrix = mat2(c, -s, s, c);
    vec2 rotated = rotationMatrix * offset;
    return rotated + center;
  }

  vec4 sampleWithBlur(sampler2D tex, vec2 uv, float angle, float blurAmount) {
    if (blurAmount < 0.01) {
      vec2 rotatedUV = rotate(uv, angle, vec2(0.5));
      if (rotatedUV.x < 0.0 || rotatedUV.x > 1.0 || rotatedUV.y < 0.0 || rotatedUV.y > 1.0) {
        return vec4(0.0);
      }
      return texture2D(tex, rotatedUV);
    }

    vec4 color = vec4(0.0);
    float total = 0.0;

    // Rotational motion blur
    for (float i = 0.0; i < 8.0; i++) {
      float offset = (i / 8.0 - 0.5) * blurAmount;
      vec2 rotatedUV = rotate(uv, angle + offset, vec2(0.5));

      if (rotatedUV.x >= 0.0 && rotatedUV.x <= 1.0 && rotatedUV.y >= 0.0 && rotatedUV.y <= 1.0) {
        color += texture2D(tex, rotatedUV);
        total += 1.0;
      }
    }

    return total > 0.0 ? color / total : vec4(0.0);
  }

  void main() {
    vec2 center = vec2(0.5);

    // Scale coordinates
    vec2 scaledUV = (v_texCoord - center) / u_scale + center;

    // Sample source with rotation
    float sourceRotation = u_rotation * (1.0 - u_progress);
    vec4 sourceColor = sampleWithBlur(u_sourceTexture, scaledUV, sourceRotation, u_blur);

    // Sample target with rotation
    float targetRotation = -u_rotation * u_progress;
    vec4 targetColor = sampleWithBlur(u_targetTexture, scaledUV, targetRotation, u_blur);

    // Crossfade
    gl_FragColor = mix(sourceColor, targetColor, u_progress);
  }
`;
