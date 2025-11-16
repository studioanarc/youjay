/**
 * Brightness Effect Shader
 *
 * Adjusts the brightness/exposure of the image.
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
  uniform float amount; // -1.0 to 1.0 (0.0 = no change)
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Apply brightness adjustment
    color.rgb += amount;

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  amount: { value: 0.0 },
};
