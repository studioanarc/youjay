import { getDB, handleQuotaExceeded, DatabaseError } from './db';
import type { SceneData } from './db';
import type { AppState } from '../types';

/**
 * Save a complete scene (app state snapshot) to the database
 */
export async function saveScene(
  name: string,
  state: Partial<AppState>,
  options: {
    description?: string;
    thumbnail?: string;
    tags?: string[];
  } = {}
): Promise<SceneData> {
  try {
    const db = await getDB();
    const now = Date.now();

    const scene: SceneData = {
      id: `scene-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: options.description,
      thumbnail: options.thumbnail,
      state,
      createdAt: now,
      updatedAt: now,
      tags: options.tags,
    };

    await db.put('scenes', scene);
    console.log(`Scene saved: ${name} (${scene.id})`);
    return scene;
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to save scene', error);
  }
}

/**
 * Get a scene by ID
 */
export async function getScene(id: string): Promise<SceneData | undefined> {
  try {
    const db = await getDB();
    const scene = await db.get('scenes', id);
    return scene;
  } catch (error) {
    console.error('Failed to get scene:', error);
    throw new DatabaseError('Failed to get scene', error);
  }
}

/**
 * Get all scenes
 */
export async function getAllScenes(): Promise<SceneData[]> {
  try {
    const db = await getDB();
    const scenes = await db.getAll('scenes');
    return scenes;
  } catch (error) {
    console.error('Failed to get all scenes:', error);
    throw new DatabaseError('Failed to get all scenes', error);
  }
}

/**
 * Get scenes sorted by date (newest first)
 */
export async function getScenesByDate(limit?: number): Promise<SceneData[]> {
  try {
    const db = await getDB();
    const tx = db.transaction('scenes', 'readonly');
    const index = tx.store.index('by-date');

    const scenes: SceneData[] = [];
    let cursor = await index.openCursor(null, 'prev'); // Descending order

    while (cursor && (!limit || scenes.length < limit)) {
      scenes.push(cursor.value);
      cursor = await cursor.continue();
    }

    await tx.done;
    return scenes;
  } catch (error) {
    console.error('Failed to get scenes by date:', error);
    throw new DatabaseError('Failed to get scenes by date', error);
  }
}

/**
 * Search scenes by name (case-insensitive)
 */
export async function searchScenesByName(query: string): Promise<SceneData[]> {
  try {
    const db = await getDB();
    const allScenes = await db.getAll('scenes');

    const lowerQuery = query.toLowerCase();
    return allScenes.filter(
      (scene) =>
        scene.name.toLowerCase().includes(lowerQuery) ||
        scene.description?.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Failed to search scenes:', error);
    throw new DatabaseError('Failed to search scenes', error);
  }
}

/**
 * Search scenes by tags
 */
export async function searchScenesByTags(tags: string[]): Promise<SceneData[]> {
  try {
    const db = await getDB();
    const allScenes = await db.getAll('scenes');

    return allScenes.filter(
      (scene) => scene.tags && tags.some((tag) => scene.tags!.includes(tag))
    );
  } catch (error) {
    console.error('Failed to search scenes by tags:', error);
    throw new DatabaseError('Failed to search scenes by tags', error);
  }
}

/**
 * Update a scene
 */
export async function updateScene(
  id: string,
  updates: Partial<Omit<SceneData, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const db = await getDB();
    const existing = await db.get('scenes', id);

    if (!existing) {
      throw new Error(`Scene not found: ${id}`);
    }

    const updated: SceneData = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.put('scenes', updated);
    console.log(`Scene updated: ${id}`);
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to update scene', error);
  }
}

/**
 * Delete a scene
 */
export async function deleteScene(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('scenes', id);
    console.log(`Scene deleted: ${id}`);
  } catch (error) {
    console.error('Failed to delete scene:', error);
    throw new DatabaseError('Failed to delete scene', error);
  }
}

/**
 * Delete multiple scenes
 */
export async function deleteScenes(ids: string[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('scenes', 'readwrite');

    await Promise.all(ids.map((id) => tx.store.delete(id)));
    await tx.done;

    console.log(`Deleted ${ids.length} scenes`);
  } catch (error) {
    console.error('Failed to delete scenes:', error);
    throw new DatabaseError('Failed to delete scenes', error);
  }
}

/**
 * Duplicate a scene
 */
export async function duplicateScene(id: string, newName?: string): Promise<SceneData> {
  try {
    const original = await getScene(id);

    if (!original) {
      throw new Error(`Scene not found: ${id}`);
    }

    const now = Date.now();
    const duplicate: SceneData = {
      ...original,
      id: `scene-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: newName || `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDB();
    await db.put('scenes', duplicate);

    console.log(`Scene duplicated: ${duplicate.name} (${duplicate.id})`);
    return duplicate;
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to duplicate scene', error);
  }
}

/**
 * Load a scene and return the app state
 */
export async function loadScene(id: string): Promise<Partial<AppState> | null> {
  try {
    const scene = await getScene(id);
    if (!scene) {
      console.warn(`Scene not found: ${id}`);
      return null;
    }

    console.log(`Scene loaded: ${scene.name} (${id})`);
    return scene.state;
  } catch (error) {
    console.error('Failed to load scene:', error);
    throw new DatabaseError('Failed to load scene', error);
  }
}

/**
 * Batch save scenes
 */
export async function batchSaveScenes(scenes: SceneData[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction('scenes', 'readwrite');

    await Promise.all(scenes.map((scene) => tx.store.put(scene)));
    await tx.done;

    console.log(`Batch saved ${scenes.length} scenes`);
  } catch (error: any) {
    handleQuotaExceeded(error);
    throw new DatabaseError('Failed to batch save scenes', error);
  }
}

/**
 * Get recent scenes (last N scenes)
 */
export async function getRecentScenes(limit: number = 10): Promise<SceneData[]> {
  return getScenesByDate(limit);
}

/**
 * Check if scene name exists
 */
export async function sceneNameExists(name: string, excludeId?: string): Promise<boolean> {
  try {
    const db = await getDB();
    const allScenes = await db.getAll('scenes');

    return allScenes.some((scene) => scene.name === name && scene.id !== excludeId);
  } catch (error) {
    console.error('Failed to check scene name:', error);
    return false;
  }
}

/**
 * Get unique scene tags
 */
export async function getAllSceneTags(): Promise<string[]> {
  try {
    const db = await getDB();
    const allScenes = await db.getAll('scenes');

    const tagSet = new Set<string>();
    allScenes.forEach((scene) => {
      if (scene.tags) {
        scene.tags.forEach((tag) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  } catch (error) {
    console.error('Failed to get all tags:', error);
    return [];
  }
}

/**
 * Generate a thumbnail for a scene from canvas
 */
export async function generateSceneThumbnail(
  canvas: HTMLCanvasElement,
  width: number = 300,
  height: number = 200
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
      const dataUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Update scene thumbnail
 */
export async function updateSceneThumbnail(
  id: string,
  canvas: HTMLCanvasElement
): Promise<void> {
  try {
    const thumbnail = await generateSceneThumbnail(canvas);
    await updateScene(id, { thumbnail });
    console.log(`Scene thumbnail updated: ${id}`);
  } catch (error) {
    console.error('Failed to update scene thumbnail:', error);
    throw new DatabaseError('Failed to update scene thumbnail', error);
  }
}

/**
 * Delete old scenes (older than specified days)
 */
export async function deleteOldScenes(daysOld: number): Promise<number> {
  try {
    const db = await getDB();
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const tx = db.transaction('scenes', 'readwrite');
    const index = tx.store.index('by-date');

    let cursor = await index.openCursor(IDBKeyRange.upperBound(cutoffTime));
    let deletedCount = 0;

    while (cursor) {
      await cursor.delete();
      deletedCount++;
      cursor = await cursor.continue();
    }

    await tx.done;
    console.log(`Deleted ${deletedCount} old scenes`);
    return deletedCount;
  } catch (error) {
    console.error('Failed to delete old scenes:', error);
    throw new DatabaseError('Failed to delete old scenes', error);
  }
}

/**
 * Get scene count
 */
export async function getSceneCount(): Promise<number> {
  try {
    const db = await getDB();
    return await db.count('scenes');
  } catch (error) {
    console.error('Failed to get scene count:', error);
    return 0;
  }
}
