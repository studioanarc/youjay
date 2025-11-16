/**
 * Blur Effect Shader
 *
 * Gaussian blur with adjustable intensity.
 * Uses a 9-tap filter for performance.
 */

export const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float amount; // 0.0 - 1.0
  varying vec2 vUv;

  void main() {
    vec2 texelSize = 1.0 / resolution;
    float blurSize = amount * 5.0;

    // 9-tap Gaussian blur
    vec4 color = vec4(0.0);
    float total = 0.0;

    for (float x = -2.0; x <= 2.0; x += 1.0) {
      for (float y = -2.0; y <= 2.0; y += 1.0) {
        vec2 offset = vec2(x, y) * texelSize * blurSize;
        float weight = exp(-(x * x + y * y) / 8.0);
        color += texture2D(tDiffuse, vUv + offset) * weight;
        total += weight;
      }
    }

    gl_FragColor = color / total;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  resolution: { value: [1920, 1080] },
  amount: { value: 0.5 },
};
