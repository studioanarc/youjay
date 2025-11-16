/**
 * Mirror Effect Shader
 *
 * Mirrors the image horizontally, vertically, or both.
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
  uniform float horizontal; // 0.0 or 1.0
  uniform float vertical; // 0.0 or 1.0
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Mirror horizontally
    if (horizontal > 0.5) {
      if (uv.x > 0.5) {
        uv.x = 1.0 - uv.x;
      }
    }

    // Mirror vertically
    if (vertical > 0.5) {
      if (uv.y > 0.5) {
        uv.y = 1.0 - uv.y;
      }
    }

    vec4 color = texture2D(tDiffuse, uv);

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  horizontal: { value: 0.0 },
  vertical: { value: 0.0 },
};
