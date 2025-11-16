import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Preset, CustomShader, MIDIMapping } from '../types';

// Database version for migrations
const DB_NAME = 'vj-webapp-db';
const DB_VERSION = 1;

// Define database schema
export interface VJDatabaseSchema extends DBSchema {
  presets: {
    key: string;
    value: Preset & { tags?: string[] };
    indexes: {
      'by-type': string;
      'by-date': number;
      'by-name': string;
    };
  };
  scenes: {
    key: string;
    value: SceneData;
    indexes: {
      'by-date': number;
      'by-name': string;
    };
  };
  shaders: {
    key: string;
    value: CustomShader & { tags?: string[]; createdAt: number; updatedAt: number };
    indexes: {
      'by-name': string;
      'by-date': number;
    };
  };
  'midi-mappings': {
    key: string;
    value: MIDIMapping & { profileName?: string; createdAt: number };
    indexes: {
      'by-device': string;
      'by-profile': string;
    };
  };
  backups: {
    key: string;
    value: BackupData;
    indexes: {
      'by-date': number;
    };
  };
}

// Scene data structure
export interface SceneData {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  state: any; // Complete app state
  createdAt: number;
  updatedAt: number;
  tags?: string[];
}

// Backup data structure
export interface BackupData {
  id: string;
  timestamp: number;
  type: 'auto' | 'manual';
  data: {
    presets: Preset[];
    scenes: SceneData[];
    shaders: CustomShader[];
    midiMappings: MIDIMapping[];
  };
}

// Database instance
let dbInstance: IDBPDatabase<VJDatabaseSchema> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
export async function initDB(): Promise<IDBPDatabase<VJDatabaseSchema>> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    dbInstance = await openDB<VJDatabaseSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, _transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);

        // Create presets object store
        if (!db.objectStoreNames.contains('presets')) {
          const presetStore = db.createObjectStore('presets', { keyPath: 'id' });
          presetStore.createIndex('by-type', 'type');
          presetStore.createIndex('by-date', 'createdAt');
          presetStore.createIndex('by-name', 'name');
        }

        // Create scenes object store
        if (!db.objectStoreNames.contains('scenes')) {
          const sceneStore = db.createObjectStore('scenes', { keyPath: 'id' });
          sceneStore.createIndex('by-date', 'createdAt');
          sceneStore.createIndex('by-name', 'name');
        }

        // Create shaders object store
        if (!db.objectStoreNames.contains('shaders')) {
          const shaderStore = db.createObjectStore('shaders', { keyPath: 'id' });
          shaderStore.createIndex('by-name', 'name');
          shaderStore.createIndex('by-date', 'createdAt');
        }

        // Create midi-mappings object store
        if (!db.objectStoreNames.contains('midi-mappings')) {
          const midiStore = db.createObjectStore('midi-mappings', { keyPath: 'id' });
          midiStore.createIndex('by-device', 'deviceId');
          midiStore.createIndex('by-profile', 'profileName');
        }

        // Create backups object store
        if (!db.objectStoreNames.contains('backups')) {
          const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
          backupStore.createIndex('by-date', 'timestamp');
        }
      },
      blocked() {
        console.warn('Database upgrade blocked. Please close other tabs with this site open.');
      },
      blocking() {
        console.warn('Database blocking upgrade. Closing connection...');
        if (dbInstance) {
          dbInstance.close();
          dbInstance = null;
        }
      },
      terminated() {
        console.error('Database connection terminated unexpectedly.');
        dbInstance = null;
      },
    });

    console.log('Database initialized successfully');
    return dbInstance;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new DatabaseError('Failed to initialize database', error);
  }
}

/**
 * Get the database instance (initialize if needed)
 */
export async function getDB(): Promise<IDBPDatabase<VJDatabaseSchema>> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('Database connection closed');
  }
}

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['presets', 'scenes', 'shaders', 'midi-mappings', 'backups'], 'readwrite');

  await Promise.all([
    tx.objectStore('presets').clear(),
    tx.objectStore('scenes').clear(),
    tx.objectStore('shaders').clear(),
    tx.objectStore('midi-mappings').clear(),
    tx.objectStore('backups').clear(),
    tx.done,
  ]);

  console.log('All data cleared from database');
}

/**
 * Clear specific object store
 */
export async function clearStore(storeName: 'presets' | 'scenes' | 'shaders' | 'midi-mappings' | 'backups'): Promise<void> {
  const db = await getDB();
  await db.clear(storeName);
  console.log(`Cleared store: ${storeName}`);
}

/**
 * Get storage usage statistics
 */
export async function getStorageStats(): Promise<StorageStats> {
  if (!navigator.storage || !navigator.storage.estimate) {
    throw new Error('Storage API not supported');
  }

  const estimate = await navigator.storage.estimate();
  const db = await getDB();

  // Count items in each store
  const tx = db.transaction(['presets', 'scenes', 'shaders', 'midi-mappings', 'backups'], 'readonly');

  const [presetCount, sceneCount, shaderCount, midiCount, backupCount] = await Promise.all([
    tx.objectStore('presets').count(),
    tx.objectStore('scenes').count(),
    tx.objectStore('shaders').count(),
    tx.objectStore('midi-mappings').count(),
    tx.objectStore('backups').count(),
  ]);

  await tx.done;

  return {
    usage: estimate.usage || 0,
    quota: estimate.quota || 0,
    percentUsed: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
    counts: {
      presets: presetCount,
      scenes: sceneCount,
      shaders: shaderCount,
      midiMappings: midiCount,
      backups: backupCount,
    },
  };
}

export interface StorageStats {
  usage: number;
  quota: number;
  percentUsed: number;
  counts: {
    presets: number;
    scenes: number;
    shaders: number;
    midiMappings: number;
    backups: number;
  };
}

/**
 * Check if storage quota is nearly exceeded
 */
export async function isStorageQuotaExceeded(threshold: number = 0.9): Promise<boolean> {
  const stats = await getStorageStats();
  return stats.percentUsed >= threshold * 100;
}

/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
  originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}

/**
 * Handle quota exceeded errors
 */
export function handleQuotaExceeded(error: any): void {
  if (error.name === 'QuotaExceededError') {
    console.error('Storage quota exceeded. Consider deleting old presets or scenes.');
    throw new DatabaseError(
      'Storage quota exceeded. Please delete some old presets or scenes to free up space.',
      error
    );
  }
  throw error;
}

/**
 * Database migration utilities
 */
export async function migrateDatabase(fromVersion: number, toVersion: number): Promise<void> {
  console.log(`Migrating database from version ${fromVersion} to ${toVersion}`);

  // Add migration logic here for future versions
  switch (toVersion) {
    case 1:
      // Initial version, no migration needed
      break;
    default:
      console.log('No migration needed');
  }
}

// Export database name and version for reference
export { DB_NAME, DB_VERSION };
