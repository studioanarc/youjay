import React from 'react';
import { useVJStore } from '../store';
import { Panel } from './Panel';
import { IconButton } from './IconButton';
import { Slider } from './Slider';
import styles from './LayerPanel.module.css';

export const LayerPanel: React.FC = () => {
  const { layers, selectedLayerId, setSelectedLayer, addLayer, removeLayer, updateLayer, reorderLayers } = useVJStore();

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
    if (fromIndex !== toIndex) {
      reorderLayers(fromIndex, toIndex);
    }
  };

  const blendModes = [
    'normal', 'multiply', 'screen', 'overlay', 'add', 'subtract',
    'difference', 'lighten', 'darken', 'color-dodge', 'color-burn'
  ];

  return (
    <Panel
      title="Layers"
      headerActions={
        <IconButton
          icon="+"
          size="sm"
          variant="primary"
          onClick={addLayer}
          title="Add Layer"
        />
      }
    >
      <div className={styles.layerList}>
        {layers.map((layer, index) => (
          <div
            key={layer.id}
            className={`${styles.layer} ${selectedLayerId === layer.id ? styles.selected : ''}`}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onClick={() => setSelectedLayer(layer.id)}
          >
            <div className={styles.layerHeader}>
              <div className={styles.layerInfo}>
                <IconButton
                  icon="☰"
                  size="sm"
                  className={styles.dragHandle}
                  title="Drag to reorder"
                />
                <input
                  type="text"
                  value={layer.name}
                  onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                  className={styles.layerName}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className={styles.layerActions}>
                <IconButton
                  icon={layer.visible ? '👁' : '⚫'}
                  size="sm"
                  active={layer.visible}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateLayer(layer.id, { visible: !layer.visible });
                  }}
                  title="Toggle visibility"
                />
                <IconButton
                  icon="×"
                  size="sm"
                  variant="danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeLayer(layer.id);
                  }}
                  title="Remove layer"
                />
              </div>
            </div>

            <div className={styles.layerControls}>
              <Slider
                label="Opacity"
                value={layer.opacity}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => updateLayer(layer.id, { opacity: value })}
              />

              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Blend Mode</label>
                <select
                  value={layer.blendMode}
                  onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value as any })}
                  className={styles.select}
                  onClick={(e) => e.stopPropagation()}
                >
                  {blendModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              {layer.effects.length > 0 && (
                <div className={styles.effectsCount}>
                  {layer.effects.length} effect{layer.effects.length !== 1 ? 's' : ''} applied
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
