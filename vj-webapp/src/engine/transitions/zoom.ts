/**
 * Zoom Transitions
 *
 * Zoom in/out effects for dynamic transitions
 */

import { clamp } from '../../utils/easing';

export type ZoomDirection = 'in' | 'out';

export interface ZoomParams {
  direction?: ZoomDirection;
  intensity?: number; // How much to zoom (1 = 100%, 2 = 200%)
  centerX?: number; // Zoom center X (0-1)
  centerY?: number; // Zoom center Y (0-1)
  blur?: number; // Motion blur amount (0-1)
}

/**
 * Apply zoom transition
 */
export const applyZoom = (
  progress: number,
  params: ZoomParams = {}
): {
  progress: number;
  scale: number;
  opacity: number;
  centerX: number;
  centerY: number;
  blur: number;
} => {
  const {
    direction = 'in',
    intensity = 1.5,
    centerX = 0.5,
    centerY = 0.5,
    blur = 0.3,
  } = params;

  const p = clamp(progress, 0, 1);

  // Calculate scale based on direction
  let scale: number;
  if (direction === 'in') {
    // Start large, zoom in to normal
    scale = 1 + (intensity - 1) * (1 - p);
  } else {
    // Start normal, zoom out large
    scale = 1 + (intensity - 1) * p;
  }

  // Fade out as we zoom (optional)
  const opacity = 1 - Math.abs(0.5 - p) * 0.5;

  return {
    progress: p,
    scale,
    opacity,
    centerX: clamp(centerX, 0, 1),
    centerY: clamp(centerY, 0, 1),
    blur: clamp(blur, 0, 1) * p * (1 - p) * 4, // Peak blur at middle of transition
  };
};

/**
 * Generate zoom shader uniforms
 */
export const getZoomUniforms = (
  progress: number,
  params: ZoomParams = {}
): Record<string, number> => {
  const zoomData = applyZoom(progress, params);

  return {
    u_progress: zoomData.progress,
    u_scale: zoomData.scale,
    u_opacity: zoomData.opacity,
    u_centerX: zoomData.centerX,
    u_centerY: zoomData.centerY,
    u_blur: zoomData.blur,
  };
};

/**
 * Zoom transition shader code
 */
export const zoomShaderCode = `
  uniform sampler2D u_sourceTexture;
  uniform sampler2D u_targetTexture;
  uniform float u_progress;
  uniform float u_scale;
  uniform vec2 u_center;
  uniform float u_blur;

  varying vec2 v_texCoord;

  vec4 sampleWithBlur(sampler2D tex, vec2 uv, float blurAmount) {
    if (blurAmount < 0.01) {
      return texture2D(tex, uv);
    }

    vec4 color = vec4(0.0);
    float total = 0.0;

    // Simple radial blur
    for (float i = 0.0; i < 8.0; i++) {
      float offset = (i / 8.0 - 0.5) * blurAmount * 0.1;
      vec2 sampleUV = mix(uv, u_center, offset);

      // Check bounds
      if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
        color += texture2D(tex, sampleUV);
        total += 1.0;
      }
    }

    return total > 0.0 ? color / total : vec4(0.0);
  }

  void main() {
    vec2 center = u_center;

    // Calculate zoomed coordinates for source
    vec2 sourceUV = (v_texCoord - center) / u_scale + center;

    // Calculate zoomed coordinates for target (inverse)
    vec2 targetUV = (v_texCoord - center) * u_scale + center;

    vec4 sourceColor = sampleWithBlur(u_sourceTexture, sourceUV, u_blur);
    vec4 targetColor = sampleWithBlur(u_targetTexture, targetUV, u_blur);

    // Handle out of bounds
    if (sourceUV.x < 0.0 || sourceUV.x > 1.0 || sourceUV.y < 0.0 || sourceUV.y > 1.0) {
      sourceColor = vec4(0.0);
    }
    if (targetUV.x < 0.0 || targetUV.x > 1.0 || targetUV.y < 0.0 || targetUV.y > 1.0) {
      targetColor = vec4(0.0);
    }

    // Crossfade between source and target
    gl_FragColor = mix(sourceColor, targetColor, u_progress);
  }
`;
