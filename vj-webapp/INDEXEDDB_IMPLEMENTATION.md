# IndexedDB Implementation for VJ Webapp

## Overview

This implementation provides a comprehensive IndexedDB-based persistence layer for the VJ webapp, enabling users to save, manage, and share their presets, scenes, shaders, and MIDI mappings.

## Files Created

### 1. `/src/utils/db.ts`
**Purpose**: Core database setup and management

**Key Features**:
- Database initialization using the `idb` library (promise-based IndexedDB wrapper)
- Database name: `vj-webapp-db`
- Version: 1 (with migration support)
- 5 object stores: `presets`, `scenes`, `shaders`, `midi-mappings`, `backups`
- Storage quota monitoring and error handling
- Database lifecycle management (init, close, clear)

**Main Functions**:
```typescript
initDB(): Promise<IDBPDatabase>          // Initialize database
getDB(): Promise<IDBPDatabase>           // Get database instance
closeDB(): void                          // Close connection
clearAllData(): Promise<void>            // Clear all data
clearStore(storeName): Promise<void>     // Clear specific store
getStorageStats(): Promise<StorageStats> // Get usage statistics
isStorageQuotaExceeded(): Promise<bool>  // Check quota status
```

**Object Store Schemas**:

**Presets**:
- Key: `id` (string)
- Indexes: `by-type`, `by-date`, `by-name`
- Fields: All Preset fields + optional `tags[]`

**Scenes**:
- Key: `id` (string)
- Indexes: `by-date`, `by-name`
- Fields: `id`, `name`, `description`, `thumbnail`, `state`, `createdAt`, `updatedAt`, `tags`

**Shaders**:
- Key: `id` (string)
- Indexes: `by-name`, `by-date`
- Fields: All CustomShader fields + `createdAt`, `updatedAt`, `tags`

**MIDI Mappings**:
- Key: `id` (string)
- Indexes: `by-device`, `by-profile`
- Fields: All MIDIMapping fields + `profileName`, `createdAt`

**Backups**:
- Key: `id` (string)
- Indexes: `by-date`
- Fields: `id`, `timestamp`, `type` ('auto' | 'manual'), `data`

---

### 2. `/src/utils/presetStorage.ts`
**Purpose**: CRUD operations for presets

**Key Features**:
- Full CRUD operations for presets
- Search by name, type, date, and tags
- Thumbnail generation from canvas
- Duplicate presets
- Batch operations
- Auto-cleanup of old presets

**Main Functions**:
```typescript
// Basic CRUD
savePreset(preset, tags?): Promise<void>
getPreset(id): Promise<Preset | undefined>
getAllPresets(): Promise<Preset[]>
updatePreset(id, updates): Promise<void>
deletePreset(id): Promise<void>
deletePresets(ids[]): Promise<void>

// Queries
getPresetsByType(type): Promise<Preset[]>
getPresetsByDate(limit?): Promise<Preset[]>
searchPresetsByName(query): Promise<Preset[]>
searchPresetsByTags(tags[]): Promise<Preset[]>

// Utilities
duplicatePreset(id, newName?): Promise<Preset>
generatePresetThumbnail(canvas, w, h): Promise<string>
getPresetCountByType(): Promise<Record<type, number>>
batchSavePresets(presets[]): Promise<void>
getRecentPresets(limit): Promise<Preset[]>
presetNameExists(name, excludeId?): Promise<boolean>
getAllPresetTags(): Promise<string[]>
deleteOldPresets(daysOld): Promise<number>
```

**Example Usage**:
```typescript
import { savePreset, getPresetsByType, generatePresetThumbnail } from './utils/presetStorage';

// Save a preset with thumbnail
const canvas = document.querySelector('canvas');
const thumbnail = await generatePresetThumbnail(canvas);

const preset = {
  id: 'preset-123',
  name: 'My Effect',
  description: 'Cool glitch effect',
  type: 'effect',
  data: { /* effect data */ },
  thumbnail,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

await savePreset(preset, ['glitch', 'vintage']);

// Search presets
const effectPresets = await getPresetsByType('effect');
const glitchPresets = await searchPresetsByTags(['glitch']);
```

---

### 3. `/src/utils/sceneStorage.ts`
**Purpose**: Save and load complete scene configurations

**Key Features**:
- Save entire app state as scenes
- Scene thumbnails
- Search and filter scenes
- Duplicate scenes
- Load scenes back into app state

**Main Functions**:
```typescript
// Basic operations
saveScene(name, state, options): Promise<SceneData>
getScene(id): Promise<SceneData | undefined>
getAllScenes(): Promise<SceneData[]>
loadScene(id): Promise<Partial<AppState> | null>
updateScene(id, updates): Promise<void>
deleteScene(id): Promise<void>
deleteScenes(ids[]): Promise<void>

// Queries
getScenesByDate(limit?): Promise<SceneData[]>
searchScenesByName(query): Promise<SceneData[]>
searchScenesByTags(tags[]): Promise<SceneData[]>

// Utilities
duplicateScene(id, newName?): Promise<SceneData>
generateSceneThumbnail(canvas, w, h): Promise<string>
updateSceneThumbnail(id, canvas): Promise<void>
batchSaveScenes(scenes[]): Promise<void>
getRecentScenes(limit): Promise<SceneData[]>
sceneNameExists(name, excludeId?): Promise<boolean>
getAllSceneTags(): Promise<string[]>
deleteOldScenes(daysOld): Promise<number>
getSceneCount(): Promise<number>
```

**Example Usage**:
```typescript
import { saveScene, loadScene } from './utils/sceneStorage';
import { useVJStore } from './store';

// Save current state as a scene
const state = useVJStore.getState();
const canvas = document.querySelector('canvas');
const thumbnail = await generateSceneThumbnail(canvas);

const scene = await saveScene('My Live Set', {
  layers: state.layers,
  bpm: state.bpm,
  masterOpacity: state.masterOpacity,
  audioReactivity: state.audioReactivity,
}, {
  description: 'Festival setup 2024',
  thumbnail,
  tags: ['live', 'festival'],
});

// Load a scene
const loadedState = await loadScene(scene.id);
if (loadedState) {
  // Apply state to store
  useVJStore.setState(loadedState);
}
```

---

### 4. `/src/utils/exportImport.ts`
**Purpose**: Export/import functionality and backups

**Key Features**:
- Export to JSON files for sharing
- Import from JSON with merge/replace options
- Automatic backups with cleanup
- Restore from backups
- File download utilities

**Main Functions**:
```typescript
// Export
exportPresets(): Promise<string>
exportScenes(): Promise<string>
exportShaders(): Promise<string>
exportMidiMappings(): Promise<string>
exportAll(): Promise<string>

// Download
downloadJSON(json, filename): void
downloadPresets(filename?): Promise<void>
downloadScenes(filename?): Promise<void>
downloadAllData(filename?): Promise<void>

// Import
importPresets(json, options): Promise<number>
importScenes(json, options): Promise<number>
importAll(json, options): Promise<ImportCounts>
importFromFile(file, options): Promise<ImportCounts>

// Backups
createBackup(type): Promise<string>
restoreFromBackup(backupId): Promise<void>
getAllBackups(): Promise<BackupData[]>
cleanupOldBackups(keepCount): Promise<number>
deleteBackup(backupId): Promise<void>
```

**Example Usage**:
```typescript
import {
  downloadAllData,
  importFromFile,
  createBackup,
  restoreFromBackup,
} from './utils/exportImport';

// Export all data
await downloadAllData('my-vj-setup.json');

// Import from file
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const counts = await importFromFile(file, { merge: true });
console.log(`Imported ${counts.presets} presets, ${counts.scenes} scenes`);

// Create automatic backup
const backupId = await createBackup('auto');

// Restore from backup
await restoreFromBackup(backupId);
```

---

## Store Integration

### Updated Files:
- `/src/store/index.ts` - Added database integration

**Changes Made**:
1. Added database imports
2. Added `isDbInitialized` state flag
3. Added `initializeDatabase()` action
4. Modified `addPreset()` to auto-save to database
5. Modified `removePreset()` to auto-delete from database

**New Store Interface**:
```typescript
interface VJStore {
  // ... existing properties

  isDbInitialized: boolean;
  initializeDatabase: () => Promise<void>;
}
```

**Initialization**:
```typescript
import { useVJStore } from './store';

// In your app initialization (e.g., App.tsx useEffect)
useEffect(() => {
  useVJStore.getState().initializeDatabase();
}, []);
```

**Auto-save Behavior**:
- When `addPreset()` is called, the preset is automatically saved to IndexedDB
- When `removePreset()` is called, the preset is automatically deleted from IndexedDB
- Presets are loaded from IndexedDB on database initialization

---

## Usage Examples

### 1. Initialize Database on App Start

```typescript
// src/App.tsx
import { useEffect } from 'react';
import { useVJStore } from './store';

function App() {
  useEffect(() => {
    // Initialize database and load presets
    useVJStore.getState().initializeDatabase();
  }, []);

  return <div>...</div>;
}
```

### 2. Save a Preset with Thumbnail

```typescript
import { savePreset, generatePresetThumbnail } from './utils';

async function saveCurrentEffect(canvas: HTMLCanvasElement) {
  const thumbnail = await generatePresetThumbnail(canvas);

  const preset = {
    id: `preset-${Date.now()}`,
    name: 'Glitch Effect',
    description: 'RGB shift with noise',
    type: 'effect' as const,
    data: {
      effectType: 'glitch',
      parameters: {
        intensity: 0.8,
        frequency: 2.0,
      },
    },
    thumbnail,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await savePreset(preset, ['glitch', 'rgb']);
}
```

### 3. Save Current Scene

```typescript
import { saveScene, generateSceneThumbnail } from './utils';
import { useVJStore } from './store';

async function saveCurrentScene(canvas: HTMLCanvasElement) {
  const state = useVJStore.getState();
  const thumbnail = await generateSceneThumbnail(canvas);

  const scene = await saveScene('My Scene', {
    layers: state.layers,
    bpm: state.bpm,
    masterOpacity: state.masterOpacity,
    audioReactivity: state.audioReactivity,
  }, {
    description: 'Awesome visual setup',
    thumbnail,
    tags: ['live', 'performance'],
  });

  console.log('Scene saved:', scene.id);
}
```

### 4. Export/Import Data

```typescript
import { downloadAllData, importFromFile } from './utils';

// Export
async function exportData() {
  await downloadAllData(`vj-backup-${Date.now()}.json`);
}

// Import
async function importData(file: File) {
  try {
    const counts = await importFromFile(file, { merge: true });
    alert(`Imported ${counts.presets} presets and ${counts.scenes} scenes`);
  } catch (error) {
    alert('Import failed: ' + error.message);
  }
}
```

### 5. Create Automatic Backups

```typescript
import { createBackup, cleanupOldBackups } from './utils';

// Create backup every hour
setInterval(async () => {
  await createBackup('auto');
  await cleanupOldBackups(5); // Keep only 5 most recent
}, 60 * 60 * 1000);
```

### 6. Check Storage Usage

```typescript
import { getStorageStats, isStorageQuotaExceeded } from './utils';

async function checkStorage() {
  const stats = await getStorageStats();

  console.log(`Storage used: ${stats.usage / 1024 / 1024} MB`);
  console.log(`Storage quota: ${stats.quota / 1024 / 1024} MB`);
  console.log(`Percent used: ${stats.percentUsed.toFixed(2)}%`);
  console.log('Item counts:', stats.counts);

  if (await isStorageQuotaExceeded(0.9)) {
    alert('Storage is almost full! Consider deleting old presets.');
  }
}
```

### 7. Search and Filter

```typescript
import {
  searchPresetsByName,
  searchPresetsByTags,
  getPresetsByType,
} from './utils';

// Search by name
const results = await searchPresetsByName('glitch');

// Filter by tags
const tagged = await searchPresetsByTags(['live', 'festival']);

// Get all effect presets
const effects = await getPresetsByType('effect');
```

---

## Error Handling

All database operations include comprehensive error handling:

```typescript
import { DatabaseError } from './utils';

try {
  await savePreset(preset);
} catch (error) {
  if (error instanceof DatabaseError) {
    if (error.message.includes('quota exceeded')) {
      // Handle storage quota exceeded
      alert('Storage full! Please delete some old presets.');
    } else {
      // Handle other database errors
      console.error('Database error:', error);
    }
  }
}
```

---

## Database Schema Migration

The database is set up to support versioning and migrations:

```typescript
// In db.ts - upgrade function
upgrade(db, oldVersion, newVersion, transaction) {
  console.log(`Upgrading from ${oldVersion} to ${newVersion}`);

  // Version 1: Initial schema
  if (oldVersion < 1) {
    // Create stores and indexes
  }

  // Version 2: Add new features (future)
  if (oldVersion < 2) {
    // Migration logic
  }
}
```

To upgrade the schema in the future:
1. Increment `DB_VERSION` in `db.ts`
2. Add migration logic in the `upgrade` function
3. Users' databases will automatically upgrade on next app load

---

## Performance Considerations

1. **Indexing**: All queries use indexed fields for optimal performance
   - Presets: indexed by type, date, and name
   - Scenes: indexed by date and name
   - Shaders: indexed by name and date
   - MIDI mappings: indexed by device and profile

2. **Batch Operations**: Use `batchSave` functions for bulk operations

3. **Cursors**: Date-based queries use cursors for efficient pagination

4. **Storage Monitoring**: Regular quota checks prevent unexpected failures

---

## Best Practices

1. **Initialize Early**: Call `initializeDatabase()` in your app's mount effect

2. **Use Thumbnails**: Generate thumbnails for better UX in preset browsers

3. **Tag Everything**: Use tags for better organization and search

4. **Regular Backups**: Implement automatic backup schedules

5. **Cleanup Old Data**: Periodically delete old presets/scenes to save space

6. **Error Handling**: Always wrap database calls in try-catch blocks

7. **Check Quota**: Monitor storage usage and warn users

---

## API Reference

All functions are exported from `/src/utils/index.ts` for easy importing:

```typescript
import {
  // Database
  initDB,
  getDB,
  getStorageStats,

  // Presets
  savePreset,
  getAllPresets,
  deletePreset,

  // Scenes
  saveScene,
  loadScene,

  // Export/Import
  downloadAllData,
  importFromFile,
  createBackup,
} from './utils';
```

---

## Testing

To test the implementation:

1. **Initialize**: Ensure database initializes without errors
2. **Save**: Create and save presets/scenes
3. **Load**: Retrieve and verify data
4. **Search**: Test all search/filter functions
5. **Export/Import**: Export data and re-import
6. **Quota**: Test quota exceeded scenarios
7. **Cleanup**: Verify old data cleanup works

---

## Troubleshooting

**Database won't initialize**:
- Check browser IndexedDB support
- Clear browser data and retry
- Check console for errors

**Quota exceeded**:
- Delete old presets/scenes
- Use `cleanupOldBackups()`
- Export important data before clearing

**Import fails**:
- Verify JSON format matches `ExportData` interface
- Check for missing required fields
- Use merge mode to avoid conflicts

**Performance issues**:
- Use indexed queries
- Implement pagination for large datasets
- Limit cursor iterations

---

## Future Enhancements

Potential improvements for future versions:

1. **Compression**: Compress thumbnails and large data
2. **Cloud Sync**: Sync to cloud storage
3. **Versioning**: Track preset/scene versions
4. **Sharing**: Generate shareable links
5. **Templates**: Preset categories and templates
6. **Analytics**: Track most-used presets
7. **Search**: Full-text search implementation
8. **Favorites**: Mark and filter favorites

---

## Summary

This IndexedDB implementation provides:

- ✅ Complete persistence layer for VJ webapp
- ✅ Full CRUD operations for all data types
- ✅ Advanced search and filtering
- ✅ Export/import functionality
- ✅ Automatic backups
- ✅ Storage monitoring
- ✅ Error handling
- ✅ Store integration
- ✅ TypeScript type safety
- ✅ Production-ready code

All files are located in `/src/utils/`:
- `db.ts` - Core database management
- `presetStorage.ts` - Preset operations
- `sceneStorage.ts` - Scene operations
- `exportImport.ts` - Export/import/backup

The store (`/src/store/index.ts`) is integrated for seamless auto-saving.
