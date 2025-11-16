/**
 * CRT Monitor Effect Shader
 *
 * Simulates a CRT monitor with scanlines, vignette, and screen curvature.
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
  uniform float time;
  uniform float amount; // Effect intensity (0.0 - 1.0)
  uniform float curvature; // Screen curvature amount
  varying vec2 vUv;

  // Apply barrel distortion
  vec2 curveUV(vec2 uv, float strength) {
    vec2 centered = uv - 0.5;
    float dist = length(centered);
    float distortion = 1.0 + dist * dist * strength;
    return centered * distortion + 0.5;
  }

  void main() {
    // Apply screen curvature
    vec2 uv = curveUV(vUv, curvature * amount * 0.2);

    // Discard pixels outside the curved screen
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    // Sample texture
    vec3 color = texture2D(tDiffuse, uv).rgb;

    // Scanlines
    float scanline = sin(uv.y * 600.0) * 0.5 + 0.5;
    scanline = mix(1.0, scanline, amount * 0.3);
    color *= scanline;

    // Vignette
    vec2 vignetteUV = vUv - 0.5;
    float vignette = 1.0 - dot(vignetteUV, vignetteUV) * amount;
    color *= vignette;

    // RGB separation at edges
    float edgeDist = length(vUv - 0.5);
    if (edgeDist > 0.3) {
      float separation = (edgeDist - 0.3) * 0.01 * amount;
      float r = texture2D(tDiffuse, uv + vec2(separation, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(separation, 0.0)).b;
      color = vec3(r, g, b) * scanline * vignette;
    }

    // Flickering
    float flicker = 0.98 + sin(time * 50.0) * 0.02 * amount;
    color *= flicker;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  time: { value: 0.0 },
  amount: { value: 0.5 },
  curvature: { value: 1.0 },
};
