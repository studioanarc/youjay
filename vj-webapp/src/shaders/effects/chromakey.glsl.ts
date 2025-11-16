/**
 * Chroma Key (Green Screen) Effect Shader
 *
 * Removes a specific color (typically green or blue) from the image.
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
  uniform vec3 keyColor; // Color to remove (default: green)
  uniform float threshold; // Color similarity threshold (0.0 - 1.0)
  uniform float smoothness; // Edge smoothness (0.0 - 1.0)
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Calculate color distance
    float dist = distance(color.rgb, keyColor);

    // Create alpha mask with smooth edges
    float alpha = smoothstep(threshold, threshold + smoothness, dist);

    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  keyColor: { value: [0.0, 1.0, 0.0] }, // Green
  threshold: { value: 0.4 },
  smoothness: { value: 0.1 },
};
