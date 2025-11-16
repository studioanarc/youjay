/**
 * RecordingControls - UI component for video recording functionality
 */

import React from 'react';
import { useRecorder } from '../hooks/useRecorder';
import type { RecordingConfig } from '../types';

interface RecordingControlsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  includeAudio?: boolean;
  audioContext?: AudioContext;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  canvasRef,
  includeAudio = false,
  audioContext,
}) => {
  const [quality, setQuality] = React.useState<RecordingConfig['quality']>('high');
  const [fps, setFps] = React.useState<30 | 60>(60);

  const config: RecordingConfig = {
    format: 'webm',
    quality,
    fps,
    videoBitrate: 0, // Will use default based on quality
    audioBitrate: 128_000,
  };

  const {
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    downloadRecording,
    isRecording,
    isPaused,
    formattedDuration,
    formattedSize,
    supportedMimeTypes,
  } = useRecorder({
    canvasRef,
    config,
    includeAudio,
    audioContext,
  });

  return (
    <div className="recording-controls">
      <div className="recording-header">
        <h3>Recording</h3>
        {isRecording && (
          <div className={`recording-indicator ${isPaused ? 'paused' : 'active'}`}>
            <span className="dot"></span>
            <span>{isPaused ? 'PAUSED' : 'REC'}</span>
          </div>
        )}
      </div>

      {!isRecording ? (
        <div className="recording-settings">
          <div className="setting-group">
            <label htmlFor="quality-select">Quality</label>
            <select
              id="quality-select"
              value={quality}
              onChange={(e) => setQuality(e.target.value as RecordingConfig['quality'])}
            >
              <option value="low">Low (2.5 Mbps)</option>
              <option value="medium">Medium (5 Mbps)</option>
              <option value="high">High (10 Mbps)</option>
              <option value="ultra">Ultra (20 Mbps)</option>
            </select>
          </div>

          <div className="setting-group">
            <label htmlFor="fps-select">Frame Rate</label>
            <select
              id="fps-select"
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value) as 30 | 60)}
            >
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>

          {includeAudio && (
            <div className="setting-info">
              <span className="info-icon">🎵</span>
              <span>Audio recording enabled</span>
            </div>
          )}

          <button onClick={startRecording} className="btn-start-recording">
            Start Recording
          </button>
        </div>
      ) : (
        <div className="recording-active">
          <div className="recording-stats">
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{formattedDuration}</span>
            </div>
            <div className="stat">
              <span className="stat-label">File Size</span>
              <span className="stat-value">{formattedSize}</span>
            </div>
          </div>

          <div className="recording-actions">
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="btn-pause"
            >
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button onClick={stopRecording} className="btn-stop">
              Stop
            </button>
          </div>
        </div>
      )}

      {!isRecording && formattedSize !== '0 B' && (
        <div className="recording-complete">
          <p>Recording ready to download</p>
          <button onClick={downloadRecording} className="btn-download">
            Download Recording
          </button>
        </div>
      )}

      {supportedMimeTypes.length > 0 && (
        <div className="supported-formats">
          <details>
            <summary>Supported formats</summary>
            <ul>
              {supportedMimeTypes.map((type) => (
                <li key={type}>{type}</li>
              ))}
            </ul>
          </details>
        </div>
      )}

      <style>{`
        .recording-controls {
          padding: 16px;
          background: #1e1e1e;
          border-radius: 8px;
          color: #e0e0e0;
        }

        .recording-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .recording-header h3 {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .recording-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .recording-indicator.active {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .recording-indicator.paused {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .recording-indicator .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }

        .recording-indicator.active .dot {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .recording-settings {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .setting-group label {
          font-size: 12px;
          font-weight: 500;
          color: #b0b0b0;
        }

        .setting-group select {
          padding: 8px 12px;
          background: #2a2a2a;
          border: 1px solid #404040;
          border-radius: 4px;
          color: #e0e0e0;
          font-size: 13px;
          cursor: pointer;
        }

        .setting-group select:focus {
          outline: none;
          border-color: #4a9eff;
        }

        .setting-info {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(74, 158, 255, 0.1);
          border: 1px solid rgba(74, 158, 255, 0.3);
          border-radius: 4px;
          font-size: 12px;
          color: #4a9eff;
        }

        .btn-start-recording,
        .btn-pause,
        .btn-stop,
        .btn-download {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-start-recording {
          background: #ef4444;
          color: #ffffff;
          margin-top: 8px;
        }

        .btn-start-recording:hover {
          background: #dc2626;
        }

        .recording-active {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recording-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px;
          background: #2a2a2a;
          border-radius: 6px;
        }

        .stat-label {
          font-size: 11px;
          color: #808080;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .recording-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .btn-pause {
          background: #fbbf24;
          color: #000;
        }

        .btn-pause:hover {
          background: #f59e0b;
        }

        .btn-stop {
          background: #3c3c3c;
          color: #e0e0e0;
          border: 1px solid #555;
        }

        .btn-stop:hover {
          background: #4c4c4c;
        }

        .recording-complete {
          margin-top: 16px;
          padding: 12px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 6px;
          text-align: center;
        }

        .recording-complete p {
          margin: 0 0 12px 0;
          font-size: 12px;
          color: #22c55e;
        }

        .btn-download {
          background: #22c55e;
          color: #000;
          width: 100%;
        }

        .btn-download:hover {
          background: #16a34a;
        }

        .supported-formats {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #333;
        }

        .supported-formats details {
          font-size: 12px;
          color: #808080;
        }

        .supported-formats summary {
          cursor: pointer;
          user-select: none;
        }

        .supported-formats summary:hover {
          color: #b0b0b0;
        }

        .supported-formats ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
          list-style: disc;
        }

        .supported-formats li {
          margin: 4px 0;
          font-family: 'Monaco', 'Courier New', monospace;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
};
