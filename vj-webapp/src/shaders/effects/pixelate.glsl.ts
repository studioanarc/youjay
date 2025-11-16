/**
 * Pixelate Effect Shader
 *
 * Creates a pixelated/mosaic effect by sampling at lower resolution.
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
  uniform float amount; // Pixel size (1.0 - 100.0)
  varying vec2 vUv;

  void main() {
    vec2 pixelSize = vec2(amount) / resolution;

    // Snap UV coordinates to pixel grid
    vec2 pixelatedUv = floor(vUv / pixelSize) * pixelSize;

    vec4 color = texture2D(tDiffuse, pixelatedUv);

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  resolution: { value: [1920, 1080] },
  amount: { value: 10.0 },
};
