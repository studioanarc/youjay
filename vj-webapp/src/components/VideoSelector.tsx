import React, { useState, useRef } from 'react';
import { useVJStore } from '../store';
import { Panel } from './Panel';
import { Button } from './Button';
import styles from './VideoSelector.module.css';

export const VideoSelector: React.FC = () => {
  const { selectedLayerId, updateLayer } = useVJStore();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLayerId || !youtubeUrl.trim()) return;

    // Extract video ID from YouTube URL
    const videoId = extractYouTubeId(youtubeUrl);
    if (videoId) {
      updateLayer(selectedLayerId, {
        youtubeUrl,
        videoId,
        localFile: null,
      });
      setYoutubeUrl('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedLayerId) return;
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      updateLayer(selectedLayerId, {
        localFile: file,
        youtubeUrl: null,
        videoId: null,
      });
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^&\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  if (!selectedLayerId) {
    return (
      <Panel title="Video Source">
        <div className={styles.empty}>
          <p>Select a layer to add video</p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Video Source">
      <div className={styles.container}>
        <form onSubmit={handleYoutubeSubmit} className={styles.form}>
          <label className={styles.label}>YouTube URL</label>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className={styles.input}
            />
            <Button type="submit" variant="primary" size="sm">
              Load
            </Button>
          </div>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>OR</span>
        </div>

        <div className={styles.fileSection}>
          <label className={styles.label}>Local Video File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="video-file-input"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            fullWidth
          >
            Choose File
          </Button>
        </div>

        <div className={styles.info}>
          <h4 className={styles.infoTitle}>Supported formats:</h4>
          <ul className={styles.infoList}>
            <li>YouTube videos (direct URL)</li>
            <li>MP4, WebM, OGG</li>
            <li>Local video files</li>
          </ul>
        </div>
      </div>
    </Panel>
  );
};
