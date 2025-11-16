/**
 * VHS Effect Shader
 *
 * Vintage VHS tape effect with scanlines, noise, and color bleeding.
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
  varying vec2 vUv;

  // Random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;

    // Scanline distortion
    float scanline = sin(uv.y * 800.0 + time * 10.0) * 0.002 * amount;
    uv.x += scanline;

    // VHS tape wobble
    float wobble = sin(uv.y * 5.0 + time * 3.0) * 0.005 * amount;
    uv.x += wobble;

    // Sample texture with chromatic aberration
    float aberration = 0.002 * amount;
    float r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;

    vec3 color = vec3(r, g, b);

    // Add scanlines
    float scanlineIntensity = 0.1 * amount;
    float scanlinePattern = sin(uv.y * 400.0) * scanlineIntensity;
    color -= scanlinePattern;

    // Add noise
    float noise = random(uv + time * 0.5) * 0.05 * amount;
    color += noise;

    // VHS color bleeding (reduce green)
    color.g *= 1.0 - (amount * 0.1);

    // Add random horizontal lines (tracking issues)
    float lineY = floor(time * 2.0) * 0.1;
    if (abs(uv.y - lineY) < 0.002) {
      color = mix(color, vec3(random(vec2(time))), amount * 0.5);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  time: { value: 0.0 },
  amount: { value: 0.5 },
};
