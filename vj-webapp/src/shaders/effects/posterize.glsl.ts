/**
 * Posterize Effect Shader
 *
 * Reduces the number of colors for a poster-like effect.
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
  uniform float levels; // Number of color levels (2.0 - 256.0)
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Quantize each color channel
    color.rgb = floor(color.rgb * levels) / levels;

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  levels: { value: 8.0 },
};
