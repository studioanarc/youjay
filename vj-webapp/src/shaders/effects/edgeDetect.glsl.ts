/**
 * Edge Detection Effect Shader
 *
 * Sobel edge detection for highlighting edges in the image.
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
  uniform float amount; // Edge strength (0.0 - 1.0)
  varying vec2 vUv;

  void main() {
    vec2 texelSize = 1.0 / resolution;

    // Sobel kernels
    float gx = 0.0;
    float gy = 0.0;

    // Sample 3x3 grid
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 offset = vec2(float(x), float(y)) * texelSize;
        vec4 sample = texture2D(tDiffuse, vUv + offset);
        float luminance = dot(sample.rgb, vec3(0.299, 0.587, 0.114));

        // Sobel X kernel: [-1 0 1; -2 0 2; -1 0 1]
        if (x == -1) gx -= luminance * (y == 0 ? 2.0 : 1.0);
        if (x == 1) gx += luminance * (y == 0 ? 2.0 : 1.0);

        // Sobel Y kernel: [-1 -2 -1; 0 0 0; 1 2 1]
        if (y == -1) gy -= luminance * (x == 0 ? 2.0 : 1.0);
        if (y == 1) gy += luminance * (x == 0 ? 2.0 : 1.0);
      }
    }

    // Calculate edge magnitude
    float edge = sqrt(gx * gx + gy * gy);

    // Mix original with edge detection
    vec4 original = texture2D(tDiffuse, vUv);
    vec4 edges = vec4(vec3(edge), 1.0);

    gl_FragColor = mix(original, edges, amount);
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  resolution: { value: [1920, 1080] },
  amount: { value: 1.0 },
};
