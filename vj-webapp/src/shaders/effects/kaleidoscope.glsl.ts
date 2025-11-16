/**
 * Kaleidoscope Effect Shader
 *
 * Creates a kaleidoscope/mandala effect with adjustable segments.
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
  uniform float segments; // Number of segments (2.0 - 16.0)
  uniform float angle; // Rotation angle
  varying vec2 vUv;

  #define PI 3.14159265359

  void main() {
    // Center coordinates
    vec2 uv = vUv - 0.5;

    // Calculate angle and radius
    float theta = atan(uv.y, uv.x) + angle;
    float radius = length(uv);

    // Create kaleidoscope segments
    float segmentAngle = 2.0 * PI / segments;
    theta = mod(theta, segmentAngle);

    // Mirror every other segment
    if (mod(floor(atan(uv.y, uv.x) / segmentAngle), 2.0) > 0.5) {
      theta = segmentAngle - theta;
    }

    // Convert back to UV coordinates
    vec2 newUv = vec2(cos(theta), sin(theta)) * radius + 0.5;

    vec4 color = texture2D(tDiffuse, newUv);

    gl_FragColor = color;
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  segments: { value: 6.0 },
  angle: { value: 0.0 },
};
