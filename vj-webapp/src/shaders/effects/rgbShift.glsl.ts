/**
 * RGB Shift Effect Shader
 *
 * Chromatic aberration effect by shifting RGB channels.
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
  uniform float amount; // Shift amount (0.0 - 1.0)
  uniform float angle; // Shift direction in radians
  varying vec2 vUv;

  void main() {
    // Calculate shift direction
    vec2 direction = vec2(cos(angle), sin(angle));
    vec2 shift = direction * amount * 0.02;

    // Sample each channel with different offsets
    float r = texture2D(tDiffuse, vUv + shift).r;
    float g = texture2D(tDiffuse, vUv).g;
    float b = texture2D(tDiffuse, vUv - shift).b;

    gl_FragColor = vec4(r, g, b, 1.0);
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  amount: { value: 0.5 },
  angle: { value: 0.0 },
};
