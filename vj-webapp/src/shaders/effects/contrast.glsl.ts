/**
 * Contrast Effect Shader
 *
 * Adjusts the contrast of the image.
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
  uniform float amount; // 0.0 to 2.0 (1.0 = no change)
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Apply contrast adjustment
    color.rgb = (color.rgb - 0.5) * amount + 0.5;

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  amount: { value: 1.0 },
};
