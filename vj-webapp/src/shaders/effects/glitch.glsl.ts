/**
 * Glitch Effect Shader
 *
 * Digital glitch/datamosh effect with RGB displacement and scanline artifacts.
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
  uniform float amount; // Glitch intensity (0.0 - 1.0)
  uniform float speed; // Animation speed
  varying vec2 vUv;

  // Random function
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;

    // Create glitch blocks
    float blockSize = 20.0;
    float block = floor(uv.y * blockSize);
    float blockRandom = random(vec2(block, floor(time * speed)));

    // Horizontal displacement
    if (blockRandom < amount * 0.3) {
      float displacement = (random(vec2(block, time * speed)) - 0.5) * amount * 0.2;
      uv.x += displacement;
    }

    // RGB split
    float splitAmount = amount * 0.02;
    float r = texture2D(tDiffuse, uv + vec2(splitAmount, 0.0)).r;
    float g = texture2D(tDiffuse, uv).g;
    float b = texture2D(tDiffuse, uv - vec2(splitAmount, 0.0)).b;

    vec3 color = vec3(r, g, b);

    // Add scanline noise
    float scanline = random(vec2(uv.y * 1000.0, floor(time * speed * 10.0))) * amount * 0.2;
    color += scanline;

    // Random color inversion in blocks
    if (blockRandom > (1.0 - amount * 0.1)) {
      color = 1.0 - color;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const defaultUniforms = {
  tDiffuse: { value: null },
  time: { value: 0.0 },
  amount: { value: 0.5 },
  speed: { value: 1.0 },
};
