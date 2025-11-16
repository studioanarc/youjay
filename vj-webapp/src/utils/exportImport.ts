import { getAllPresets, batchSavePresets } from './presetStorage';
import { getAllScenes, batchSaveScenes } from './sceneStorage';
import { getDB, DatabaseError, type BackupData } from './db';
import type { Preset, CustomShader, MIDIMapping } from '../types';
import type { SceneData } from './db';

/**
 * Export data format
 */
export interface ExportData {
  version: string;
  exportedAt: number;
  data: {
    presets?: Preset[];
    scenes?: SceneData[];
    shaders?: CustomShader[];
    midiMappings?: MIDIMapping[];
  };
}

/**
 * Export all presets to JSON
 */
export async function exportPresets(): Promise<string> {
  try {
    const presets = await getAllPresets();

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      data: { presets },
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export presets:', error);
    throw new DatabaseError('Failed to export presets', error);
  }
}

/**
 * Export all scenes to JSON
 */
export async function exportScenes(): Promise<string> {
  try {
    const scenes = await getAllScenes();

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      data: { scenes },
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export scenes:', error);
    throw new DatabaseError('Failed to export scenes', error);
  }
}

/**
 * Export all shaders to JSON
 */
export async function exportShaders(): Promise<string> {
  try {
    const db = await getDB();
    const shaders = await db.getAll('shaders');

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      data: { shaders },
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export shaders:', error);
    throw new DatabaseError('Failed to export shaders', error);
  }
}

/**
 * Export all MIDI mappings to JSON
 */
export async function exportMidiMappings(): Promise<string> {
  try {
    const db = await getDB();
    const midiMappings = await db.getAll('midi-mappings');

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      data: { midiMappings },
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export MIDI mappings:', error);
    throw new DatabaseError('Failed to export MIDI mappings', error);
  }
}

/**
 * Export everything to JSON
 */
export async function exportAll(): Promise<string> {
  try {
    const db = await getDB();

    const [presets, scenes, shaders, midiMappings] = await Promise.all([
      db.getAll('presets'),
      db.getAll('scenes'),
      db.getAll('shaders'),
      db.getAll('midi-mappings'),
    ]);

    const exportData: ExportData = {
      version: '1.0',
      exportedAt: Date.now(),
      data: {
        presets,
        scenes,
        shaders,
        midiMappings,
      },
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('Failed to export all data:', error);
    throw new DatabaseError('Failed to export all data', error);
  }
}

/**
 * Download JSON data as a file
 */
export function downloadJSON(jsonString: string, filename: string): void {
  try {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    console.log(`Downloaded: ${filename}`);
  } catch (error) {
    console.error('Failed to download JSON:', error);
    throw new Error('Failed to download JSON file');
  }
}

/**
 * Export and download presets
 */
export async function downloadPresets(filename?: string): Promise<void> {
  const json = await exportPresets();
  const name = filename || `vj-presets-${Date.now()}.json`;
  downloadJSON(json, name);
}

/**
 * Export and download scenes
 */
export async function downloadScenes(filename?: string): Promise<void> {
  const json = await exportScenes();
  const name = filename || `vj-scenes-${Date.now()}.json`;
  downloadJSON(json, name);
}

/**
 * Export and download all data
 */
export async function downloadAllData(filename?: string): Promise<void> {
  const json = await exportAll();
  const name = filename || `vj-backup-${Date.now()}.json`;
  downloadJSON(json, name);
}

/**
 * Parse and validate import data
 */
function validateImportData(data: any): ExportData {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import data format');
  }

  if (!data.version || !data.exportedAt || !data.data) {
    throw new Error('Invalid import data structure');
  }

  return data as ExportData;
}

/**
 * Import presets from JSON
 */
export async function importPresets(
  jsonString: string,
  options: { merge?: boolean } = {}
): Promise<number> {
  try {
    const data = JSON.parse(jsonString);
    const exportData = validateImportData(data);

    if (!exportData.data.presets || exportData.data.presets.length === 0) {
      throw new Error('No presets found in import data');
    }

    const presets = exportData.data.presets;

    // If not merging, we can directly save
    // If merging, check for duplicates and handle them
    if (!options.merge) {
      await batchSavePresets(presets);
    } else {
      const db = await getDB();
      const existingPresets = await db.getAll('presets');
      const existingIds = new Set(existingPresets.map((p) => p.id));

      // Generate new IDs for duplicates
      const presetsToImport = presets.map((preset) => {
        if (existingIds.has(preset.id)) {
          return {
            ...preset,
            id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${preset.name} (Imported)`,
          };
        }
        return preset;
      });

      await batchSavePresets(presetsToImport);
    }

    console.log(`Imported ${presets.length} presets`);
    return presets.length;
  } catch (error) {
    console.error('Failed to import presets:', error);
    throw new DatabaseError('Failed to import presets', error);
  }
}

/**
 * Import scenes from JSON
 */
export async function importScenes(
  jsonString: string,
  options: { merge?: boolean } = {}
): Promise<number> {
  try {
    const data = JSON.parse(jsonString);
    const exportData = validateImportData(data);

    if (!exportData.data.scenes || exportData.data.scenes.length === 0) {
      throw new Error('No scenes found in import data');
    }

    const scenes = exportData.data.scenes;

    if (!options.merge) {
      await batchSaveScenes(scenes);
    } else {
      const db = await getDB();
      const existingScenes = await db.getAll('scenes');
      const existingIds = new Set(existingScenes.map((s) => s.id));

      // Generate new IDs for duplicates
      const scenesToImport = scenes.map((scene) => {
        if (existingIds.has(scene.id)) {
          return {
            ...scene,
            id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${scene.name} (Imported)`,
          };
        }
        return scene;
      });

      await batchSaveScenes(scenesToImport);
    }

    console.log(`Imported ${scenes.length} scenes`);
    return scenes.length;
  } catch (error) {
    console.error('Failed to import scenes:', error);
    throw new DatabaseError('Failed to import scenes', error);
  }
}

/**
 * Import all data from JSON
 */
export async function importAll(
  jsonString: string,
  options: { merge?: boolean } = {}
): Promise<{
  presets: number;
  scenes: number;
  shaders: number;
  midiMappings: number;
}> {
  try {
    const data = JSON.parse(jsonString);
    const exportData = validateImportData(data);

    const counts = {
      presets: 0,
      scenes: 0,
      shaders: 0,
      midiMappings: 0,
    };

    // Import presets
    if (exportData.data.presets && exportData.data.presets.length > 0) {
      counts.presets = await importPresets(jsonString, options);
    }

    // Import scenes
    if (exportData.data.scenes && exportData.data.scenes.length > 0) {
      counts.scenes = await importScenes(jsonString, options);
    }

    // Import shaders
    if (exportData.data.shaders && exportData.data.shaders.length > 0) {
      const db = await getDB();
      const tx = db.transaction('shaders', 'readwrite');

      const now = Date.now();
      const shaders = exportData.data.shaders.map((shader: any) => ({
        ...shader,
        createdAt: shader.createdAt || now,
        updatedAt: shader.updatedAt || now,
      }));

      if (!options.merge) {
        await Promise.all(shaders.map((shader) => tx.store.put(shader)));
      } else {
        const existing = await db.getAll('shaders');
        const existingIds = new Set(existing.map((s) => s.id));

        const shadersToImport = shaders.map((shader) => {
          if (existingIds.has(shader.id)) {
            return {
              ...shader,
              id: `shader-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: `${shader.name} (Imported)`,
            };
          }
          return shader;
        });

        await Promise.all(shadersToImport.map((shader) => tx.store.put(shader)));
      }

      await tx.done;
      counts.shaders = shaders.length;
    }

    // Import MIDI mappings
    if (exportData.data.midiMappings && exportData.data.midiMappings.length > 0) {
      const db = await getDB();
      const tx = db.transaction('midi-mappings', 'readwrite');

      const now = Date.now();
      const mappings = exportData.data.midiMappings.map((mapping: any) => ({
        ...mapping,
        createdAt: mapping.createdAt || now,
      }));

      if (!options.merge) {
        await Promise.all(mappings.map((mapping) => tx.store.put(mapping)));
      } else {
        const existing = await db.getAll('midi-mappings');
        const existingIds = new Set(existing.map((m) => m.id));

        const mappingsToImport = mappings.map((mapping) => {
          if (existingIds.has(mapping.id)) {
            return {
              ...mapping,
              id: `midi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
          }
          return mapping;
        });

        await Promise.all(mappingsToImport.map((mapping) => tx.store.put(mapping)));
      }

      await tx.done;
      counts.midiMappings = mappings.length;
    }

    console.log('Import complete:', counts);
    return counts;
  } catch (error) {
    console.error('Failed to import all data:', error);
    throw new DatabaseError('Failed to import all data', error);
  }
}

/**
 * Import from file upload
 */
export async function importFromFile(
  file: File,
  options: { merge?: boolean } = {}
): Promise<{
  presets: number;
  scenes: number;
  shaders: number;
  midiMappings: number;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const jsonString = e.target?.result as string;
        const counts = await importAll(jsonString, options);
        resolve(counts);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Create an automatic backup
 */
export async function createBackup(type: 'auto' | 'manual' = 'manual'): Promise<string> {
  try {
    const db = await getDB();

    const [presets, scenes, shaders, midiMappings] = await Promise.all([
      db.getAll('presets'),
      db.getAll('scenes'),
      db.getAll('shaders'),
      db.getAll('midi-mappings'),
    ]);

    const backup: BackupData = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      data: {
        presets,
        scenes,
        shaders,
        midiMappings,
      },
    };

    await db.put('backups', backup);
    console.log(`Backup created: ${backup.id} (${type})`);

    return backup.id;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw new DatabaseError('Failed to create backup', error);
  }
}

/**
 * Restore from a backup
 */
export async function restoreFromBackup(backupId: string): Promise<void> {
  try {
    const db = await getDB();
    const backup = await db.get('backups', backupId);

    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    // Restore data
    const tx = db.transaction(
      ['presets', 'scenes', 'shaders', 'midi-mappings'],
      'readwrite'
    );

    // Clear existing data
    await Promise.all([
      tx.objectStore('presets').clear(),
      tx.objectStore('scenes').clear(),
      tx.objectStore('shaders').clear(),
      tx.objectStore('midi-mappings').clear(),
    ]);

    // Restore from backup - ensure timestamps are present
    const now = Date.now();
    await Promise.all([
      ...backup.data.presets.map((p) => tx.objectStore('presets').put(p)),
      ...backup.data.scenes.map((s) => tx.objectStore('scenes').put(s)),
      ...backup.data.shaders.map((s: any) => tx.objectStore('shaders').put({
        ...s,
        createdAt: s.createdAt || now,
        updatedAt: s.updatedAt || now,
      })),
      ...backup.data.midiMappings.map((m: any) => tx.objectStore('midi-mappings').put({
        ...m,
        createdAt: m.createdAt || now,
      })),
    ]);

    await tx.done;
    console.log(`Restored from backup: ${backupId}`);
  } catch (error) {
    console.error('Failed to restore from backup:', error);
    throw new DatabaseError('Failed to restore from backup', error);
  }
}

/**
 * Get all backups
 */
export async function getAllBackups(): Promise<BackupData[]> {
  try {
    const db = await getDB();
    const backups = await db.getAll('backups');
    return backups.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to get backups:', error);
    return [];
  }
}

/**
 * Delete old backups (keep only the most recent N)
 */
export async function cleanupOldBackups(keepCount: number = 5): Promise<number> {
  try {
    const backups = await getAllBackups();

    if (backups.length <= keepCount) {
      return 0;
    }

    const toDelete = backups.slice(keepCount);
    const db = await getDB();
    const tx = db.transaction('backups', 'readwrite');

    await Promise.all(toDelete.map((backup) => tx.store.delete(backup.id)));
    await tx.done;

    console.log(`Deleted ${toDelete.length} old backups`);
    return toDelete.length;
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
    return 0;
  }
}

/**
 * Delete a specific backup
 */
export async function deleteBackup(backupId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('backups', backupId);
    console.log(`Backup deleted: ${backupId}`);
  } catch (error) {
    console.error('Failed to delete backup:', error);
    throw new DatabaseError('Failed to delete backup', error);
  }
}
