/**
 * ShaderPreview - Live preview of custom shader applied to video/image
 */

import React, { useRef, useEffect, useState } from 'react';
import type { CustomShader } from '../types';

interface ShaderPreviewProps {
  shader: CustomShader;
  testImage?: string;
  width?: number;
  height?: number;
}

const DEFAULT_VERTEX_SHADER = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;

varying vec2 vTexCoord;

void main() {
  vTexCoord = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

export const ShaderPreview: React.FC<ShaderPreviewProps> = ({
  shader,
  testImage = '/test-pattern.jpg',
  width = 400,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const glContext = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!glContext) {
      setError('WebGL not supported');
      return;
    }

    const gl = glContext as WebGLRenderingContext;

    let animationFrameId: number;
    let program: WebGLProgram | null = null;
    let texture: WebGLTexture | null = null;

    const compileShader = (source: string, type: number): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        setError(`Shader compilation error: ${info}`);
        gl.deleteShader(shader);
        return null;
      }

      return shader;
    };

    const createProgram = (
      vertexSource: string,
      fragmentSource: string
    ): WebGLProgram | null => {
      const vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
      const fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

      if (!vertexShader || !fragmentShader) {
        return null;
      }

      const program = gl.createProgram();
      if (!program) return null;

      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const info = gl.getProgramInfoLog(program);
        setError(`Program linking error: ${info}`);
        gl.deleteProgram(program);
        return null;
      }

      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);

      return program;
    };

    const setupGeometry = (program: WebGLProgram) => {
      // Create a quad that covers the entire canvas
      const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
         1,  1,
      ]);

      const texCoords = new Float32Array([
        0, 1,
        1, 1,
        0, 0,
        1, 0,
      ]);

      // Position buffer
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      const aPosition = gl.getAttribLocation(program, 'aPosition');
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      // TexCoord buffer
      const texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

      const aTexCoord = gl.getAttribLocation(program, 'aTexCoord');
      gl.enableVertexAttribArray(aTexCoord);
      gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
    };

    const loadTexture = (image: HTMLImageElement) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

      return texture;
    };

    const setUniforms = (program: WebGLProgram, time: number) => {
      // Set built-in uniforms
      const uTime = gl.getUniformLocation(program, 'uTime');
      if (uTime) gl.uniform1f(uTime, time);

      const uResolution = gl.getUniformLocation(program, 'uResolution');
      if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);

      // Set custom uniforms from shader definition
      Object.entries(shader.uniforms).forEach(([name, uniform]) => {
        const location = gl.getUniformLocation(program, name);
        if (!location) return;

        switch (uniform.type) {
          case 'float':
            gl.uniform1f(location, uniform.value as number);
            break;
          case 'vec2':
            gl.uniform2fv(location, uniform.value as number[]);
            break;
          case 'vec3':
            gl.uniform3fv(location, uniform.value as number[]);
            break;
          case 'vec4':
            gl.uniform4fv(location, uniform.value as number[]);
            break;
          case 'sampler2D':
            // Texture is already bound to unit 0
            gl.uniform1i(location, 0);
            break;
        }
      });
    };

    const render = (time: number) => {
      if (!program) return;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(program);

      // Bind texture
      if (texture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
      }

      // Set uniforms
      setUniforms(program, time * 0.001);

      // Draw
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameId = requestAnimationFrame(render);
    };

    const init = async () => {
      try {
        setError(null);
        setIsLoading(true);

        // Create shader program
        const vertexSource = shader.vertexShader || DEFAULT_VERTEX_SHADER;
        program = createProgram(vertexSource, shader.fragmentShader);

        if (!program) {
          return;
        }

        gl.useProgram(program);
        setupGeometry(program);

        // Load test image
        const image = new Image();
        image.crossOrigin = 'anonymous';

        await new Promise<void>((resolve) => {
          image.onload = () => {
            texture = loadTexture(image);
            setIsLoading(false);
            resolve();
          };
          image.onerror = () => {
            // Use a fallback pattern if image fails to load
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 256;
            fallbackCanvas.height = 256;
            const ctx = fallbackCanvas.getContext('2d');
            if (ctx) {
              // Create a simple gradient pattern
              const gradient = ctx.createLinearGradient(0, 0, 256, 256);
              gradient.addColorStop(0, '#4a9eff');
              gradient.addColorStop(1, '#ff4a9e');
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, 256, 256);

              texture = loadTexture(fallbackCanvas as unknown as HTMLImageElement);
            }
            setIsLoading(false);
            resolve();
          };
          image.src = testImage;
        });

        // Start render loop
        animationFrameId = requestAnimationFrame(render);
      } catch (err) {
        setError((err as Error).message);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (program) {
        gl.deleteProgram(program);
      }
      if (texture) {
        gl.deleteTexture(texture);
      }
    };
  }, [shader, testImage]);

  return (
    <div className="shader-preview">
      {isLoading && (
        <div className="preview-loading">
          <div className="spinner"></div>
          <span>Compiling shader...</span>
        </div>
      )}
      {error && (
        <div className="preview-error">
          <strong>Shader Error:</strong>
          <pre>{error}</pre>
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ opacity: error || isLoading ? 0.3 : 1 }}
      />
      <style>{`
        .shader-preview {
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }

        .shader-preview canvas {
          display: block;
          width: 100%;
          height: 100%;
          transition: opacity 0.2s;
        }

        .preview-loading,
        .preview-error {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          z-index: 10;
        }

        .preview-loading {
          color: #b0b0b0;
          font-size: 14px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #333;
          border-top-color: #4a9eff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .preview-error {
          color: #ff6b6b;
          font-size: 12px;
          text-align: left;
          background: rgba(0, 0, 0, 0.9);
        }

        .preview-error strong {
          font-weight: 600;
        }

        .preview-error pre {
          margin: 8px 0 0 0;
          padding: 12px;
          background: rgba(255, 107, 107, 0.1);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 4px;
          overflow-x: auto;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.4;
          max-height: 150px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};
