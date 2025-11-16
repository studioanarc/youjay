import { getDB, handleQuotaExceeded, DatabaseError } from './db';
import type { Preset } from '../types';

/**
 * Save a preset to the database
 */
export async function savePreset(preset: Preset, tags: string[] = []): Promise<void> {
  try {
    const db = await getDB();
    const presetWithTags = { ...preset, tags };

    await db.put('presets', presetWithTags);
    console.log(`Preset saved: ${preset.name} (${preset.id})`);
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to save preset', error);
  }
}

/**
 * Get a preset by ID
 */
export async function getPreset(id: string): Promise<Preset | undefined> {
  try {
    const db = await getDB();
    const preset = await db.get('presets', id);
    return preset;
  } catch (error) {
    console.error('Failed to get preset:', error);
    throw new DatabaseError('Failed to get preset', error);
  }
}

/**
 * Get all presets
 */
export async function getAllPresets(): Promise<Preset[]> {
  try {
    const db = await getDB();
    const presets = await db.getAll('presets');
    return presets;
  } catch (error) {
    console.error('Failed to get all presets:', error);
    throw new DatabaseError('Failed to get all presets', error);
  }
}

/**
 * Get presets by type
 */
export async function getPresetsByType(type: Preset['type']): Promise<Preset[]> {
  try {
    const db = await getDB();
    const presets = await db.getAllFromIndex('presets', 'by-type', type);
    return presets;
  } catch (error) {
    console.error('Failed to get presets by type:', error);
    throw new DatabaseError('Failed to get presets by type', error);
  }
}

/**
 * Get presets sorted by date (newest first)
 */
export async function getPresetsByDate(limit?: number): Promise<Preset[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('presets', 'readonly');
    const index = tx.store.index('by-date');

    const presets: Preset[] = [];
    let cursor = await index.openCursor(null, 'prev'); // Descending order

    while (cursor && (!limit || presets.length < limit)) {
      presets.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return presets;
  } catch (error) {
    console.error('Failed to get presets by date:', error);
    throw new DatabaseError('Failed to get presets by date', error);
  }
}

/**
 * Search presets by name (case-insensitive)
 */
export async function searchPresetsByName(query: string): Promise<Preset[]> {
  try {
    const db = await getDB();
    const allPresets = await db.getAll('presets');

    const lowerQuery = query.toLowerCase();
    return allPresets.filter((preset) =>
      preset.name.toLowerCase().includes(lowerQuery) ||
      preset.description?.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Failed to search presets:', error);
    throw new DatabaseError('Failed to search presets', error);
  }
}

/**
 * Search presets by tags
 */
export async function searchPresetsByTags(tags: string[]): Promise<Preset[]> {
  try {
    const db = await getDB();
    const allPresets = await db.getAll('presets');

    return allPresets.filter((preset: any) =>
      preset.tags && tags.some((tag: string) => preset.tags.includes(tag))
    );
  } catch (error) {
    console.error('Failed to search presets by tags:', error);
    throw new DatabaseError('Failed to search presets by tags', error);
  }
}

/**
 * Update a preset
 */
export async function updatePreset(id: string, updates: Partial<Preset>): Promise<void> {
  try {
    const db = await getDB();
    const existing = await db.get('presets', id);

    if (!existing) {
      throw new Error(`Preset not found: ${id}`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.put('presets', updated);
    console.log(`Preset updated: ${id}`);
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to update preset', error);
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('presets', id);
    console.log(`Preset deleted: ${id}`);
  } catch (error) {
    console.error('Failed to delete preset:', error);
    throw new DatabaseError('Failed to delete preset', error);
  }
}

/**
 * Delete multiple presets
 */
export async function deletePresets(ids: string[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('presets', 'readwrite');

    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;

    console.log(`Deleted ${ids.length} presets`);
  } catch (error) {
    console.error('Failed to delete presets:', error);
    throw new DatabaseError('Failed to delete presets', error);
  }
}

/**
 * Delete old presets (older than specified days)
 */
export async function deleteOldPresets(daysOld: number): Promise<number> {
  try {
    const db = await getDB();
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const tx = db.transaction('presets', 'readwrite');
    const index = tx.store.index('by-date');

    let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime));
    let deletedCount = 0;

    while (cursor) {
      await cursor.delete();
      deletedCount++;
      cursor = await cursor.continue();
    }

    await tx.done;
    console.log(`Deleted ${deletedCount} old presets`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to delete old presets:', error);
    throw new DatabaseError('Failed to delete old presets', error);
  }
}

/**
 * Generate a thumbnail for a preset
 * This captures the current canvas state as a data URL
 */
export async function generatePresetThumbnail(
  canvas: HTMLCanvasElement,
  width: number = 200,
  height: number = 150
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary canvas for thumbnail
      const thumbCanvas = document.createElement('canvas');
      thumbCanvas.width = width;
      thumbCanvas.height = height;
      const ctx = thumbCanvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw the original canvas scaled down
      ctx.drawImage(canvas, 0, 0, width, height);

      // Convert to data URL
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Duplicate a preset
 */
export async function duplicatePreset(id: string, newName?: string): Promise<Preset> {
  try {
    const original = await getPreset(id);

    if (!original) {
      throw new Error(`Preset not found: ${id}`);
    }

    const duplicate: Preset = {
      ...original,
      id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName || `${original.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await savePreset(duplicate);
    return duplicate;
  } catch (error) {
    console.error('Failed to duplicate preset:', error);
    throw new DatabaseError('Failed to duplicate preset', error);
  }
}

/**
 * Get preset count by type
 */
export async function getPresetCountByType(): Promise<Record<Preset['type'], number>> {
  try {
    const db = await getDB();
    const allPresets = await db.getAll('presets');

    const counts: Record<Preset['type'], number> = {
      scene: 0,
      effect: 0,
      transition: 0,
    };

    allPresets.forEach((preset) => {
      counts[preset.type]++;
    });

    return counts;
  } catch (error) {
    console.error('Failed to get preset counts:', error);
    throw new DatabaseError('Failed to get preset counts', error);
  }
}

/**
 * Batch save presets
 */
export async function batchSavePresets(presets: Preset[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('presets', 'readwrite');

    await Promise.all(presets.map((preset) => tx.store.put(preset)));
    await tx.done;

    console.log(`Batch saved ${presets.length} presets`);
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to batch save presets', error);
  }
}

/**
 * Get recent presets (last N presets)
 */
export async function getRecentPresets(limit: number = 10): Promise<Preset[]> {
  return getPresetsByDate(limit);
}

/**
 * Check if preset name exists
 */
export async function presetNameExists(name: string, excludeId?: string): Promise<boolean> {
  try {
    const db = await getDB();
    const allPresets = await db.getAll('presets');

    return allPresets.some(
      (preset) => preset.name === name && preset.id !== excludeId
    );
  } catch (error) {
    console.error('Failed to check preset name:', error);
    return false;
  }
}

/**
 * Get unique preset tags
 */
export async function getAllPresetTags(): Promise<string[]> {
  try {
    const db = await getDB();
    const allPresets = await db.getAll('presets');

    const tagSet = new Set<string>();
    allPresets.forEach((preset: any) => {
      if (preset.tags) {
        preset.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  } catch (error) {
    console.error('Failed to get all tags:', error);
    return [];
  }
}
