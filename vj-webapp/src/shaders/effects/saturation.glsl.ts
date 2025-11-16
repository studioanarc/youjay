/**
 * Saturation Effect Shader
 *
 * Adjusts the color saturation of the image.
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
  uniform float amount; // 0.0 to 2.0 (1.0 = no change, 0.0 = grayscale)
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Interpolate between grayscale and original color
    vec3 gray = vec3(luminance);
    color.rgb = mix(gray, color.rgb, amount);

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  amount: { value: 1.0 },
};
