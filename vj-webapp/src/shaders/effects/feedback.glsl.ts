/**
 * Feedback Effect Shader
 *
 * Creates a video feedback effect by blending with the previous frame.
 * Requires a feedback texture that stores the previous frame.
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
  uniform sampler2D tFeedback; // Previous frame
  uniform float amount; // Feedback amount (0.0 - 1.0)
  uniform float scale; // Scale factor for feedback
  uniform vec2 offset; // Offset for feedback position
  varying vec2 vUv;

  void main() {
    vec4 current = texture2D(tDiffuse, vUv);

    // Calculate feedback UV with scale and offset
    vec2 feedbackUv = (vUv - 0.5) * scale + 0.5 + offset;

    // Sample feedback texture
    vec4 feedback = texture2D(tFeedback, feedbackUv);

    // Mix current frame with feedback
    vec4 color = mix(current, feedback, amount * 0.9); // Keep it below 1.0 to prevent infinite feedback

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  tFeedback: { value: null },
  amount: { value: 0.5 },
  scale: { value: 1.0 },
  offset: { value: [0.0, 0.0] },
};
