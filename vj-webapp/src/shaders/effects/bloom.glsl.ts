/**
 * Bloom Effect Shader
 *
 * Two-pass bloom effect: extracts bright areas and applies blur.
 * This is the extraction pass. For full bloom, apply blur after this.
 */

export const vertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Bright pass extraction
export const fragmentShaderExtract = `
  uniform sampler2D tDiffuse;
  uniform float threshold; // Brightness threshold (0.0 - 1.0)
  uniform float intensity; // Bloom intensity
  varying vec2 vUv;

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);

    // Calculate luminance
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Extract bright areas
    float brightness = max(0.0, luminance - threshold);
    vec3 bloom = color.rgb * (brightness / (luminance + 0.001)) * intensity;

    gl_FragColor = vec4(bloom, color.a);
  }
`;

// Composite pass (combine original with blurred bloom)
export const fragmentShaderComposite = `
  uniform sampler2D tDiffuse; // Original image
  uniform sampler2D tBloom; // Blurred bloom texture
  uniform float amount; // Bloom amount (0.0 - 1.0)
  varying vec2 vUv;

  void main() {
    vec4 original = texture2D(tDiffuse, vUv);
    vec4 bloom = texture2D(tBloom, vUv);

    // Additive blending
    vec3 color = original.rgb + bloom.rgb * amount;

    gl_FragColor = vec4(color, original.a);
  }
`;

export const defaultUniformsExtract = {
  tDiffuse: { value: null },
  threshold: { value: 0.7 },
  intensity: { value: 1.5 },
};

export const defaultUniformsComposite = {
  tDiffuse: { value: null },
  tBloom: { value: null },
  amount: { value: 1.0 },
};
