# Quick Start Guide - IndexedDB Persistence

## 1. Initialize Database (Required)

Add this to your main App component:

```typescript
// src/App.tsx
import { useEffect } from 'react';
import { useVJStore } from './store';

function App() {
  useEffect(() => {
    // Initialize database and load saved presets
    useVJStore.getState().initializeDatabase();
  }, []);

  return (
    // Your app components
  );
}
```

## 2. Save a Preset

```typescript
import { useVJStore } from './store';

// The store automatically saves to database!
const { addPreset } = useVJStore();

addPreset({
  id: `preset-${Date.now()}`,
  name: 'My Cool Effect',
  description: 'A glitch effect',
  type: 'effect',
  data: { /* your preset data */ },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// That's it! The preset is automatically saved to IndexedDB
```

## 3. Save Current Scene

```typescript
import { saveScene, generateSceneThumbnail } from './utils';
import { useVJStore } from './store';

async function saveCurrentSetup() {
  const state = useVJStore.getState();
  const canvas = document.querySelector('canvas');
  const thumbnail = await generateSceneThumbnail(canvas);

  await saveScene('My Live Set', state, {
    description: 'My awesome setup',
    thumbnail,
    tags: ['live', 'festival'],
  });
}
```

## 4. Load a Scene

```typescript
import { loadScene } from './utils';
import { useVJStore } from './store';

async function loadMyScene(sceneId: string) {
  const state = await loadScene(sceneId);
  if (state) {
    useVJStore.setState(state);
  }
}
```

## 5. Export All Data

```typescript
import { downloadAllData } from './utils';

// Downloads a JSON file with all your data
await downloadAllData();
```

## 6. Import Data

```typescript
import { importFromFile } from './utils';

async function handleFileUpload(file: File) {
  const counts = await importFromFile(file, { merge: true });
  console.log(`Imported ${counts.presets} presets!`);
}
```

## 7. Create Auto-Backups

```typescript
import { createBackup, cleanupOldBackups } from './utils';

// Create backup every hour
setInterval(async () => {
  await createBackup('auto');
  await cleanupOldBackups(5); // Keep last 5
}, 60 * 60 * 1000);
```

## 8. Search Presets

```typescript
import { searchPresetsByName, searchPresetsByTags } from './utils';

// Search by name
const results = await searchPresetsByName('glitch');

// Search by tags
const tagged = await searchPresetsByTags(['live']);
```

## Common Patterns

### Preset Browser Component

```typescript
import { useState, useEffect } from 'react';
import { getAllPresets } from './utils';
import { useVJStore } from './store';

function PresetBrowser() {
  const [presets, setPresets] = useState([]);
  const { loadPreset } = useVJStore();

  useEffect(() => {
    getAllPresets().then(setPresets);
  }, []);

  return (
    <div>
      {presets.map((preset) => (
        <button
          key={preset.id}
          onClick={() => loadPreset(preset.id)}
        >
          {preset.thumbnail && (
            <img src={preset.thumbnail} alt={preset.name} />
          )}
          <h3>{preset.name}</h3>
          <p>{preset.description}</p>
        </button>
      ))}
    </div>
  );
}
```

### Storage Monitor Component

```typescript
import { useState, useEffect } from 'react';
import { getStorageStats } from './utils';

function StorageMonitor() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getStorageStats().then(setStats);
  }, []);

  if (!stats) return null;

  const usedMB = (stats.usage / 1024 / 1024).toFixed(2);
  const totalMB = (stats.quota / 1024 / 1024).toFixed(2);

  return (
    <div>
      <p>Storage: {usedMB} MB / {totalMB} MB</p>
      <progress value={stats.percentUsed} max={100} />
      <p>
        {stats.counts.presets} presets,
        {stats.counts.scenes} scenes
      </p>
    </div>
  );
}
```

### Export Button

```typescript
function ExportButton() {
  const handleExport = async () => {
    try {
      await downloadAllData();
      alert('Export successful!');
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  return <button onClick={handleExport}>Export All Data</button>;
}
```

### Import Button

```typescript
function ImportButton() {
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const counts = await importFromFile(file, { merge: true });
      alert(`Imported ${counts.presets} presets, ${counts.scenes} scenes!`);
    } catch (error) {
      alert('Import failed: ' + error.message);
    }
  };

  return (
    <label>
      <input type="file" accept=".json" onChange={handleImport} />
      Import Data
    </label>
  );
}
```

## Tips

1. Always initialize the database in your App component
2. Use thumbnails for better UX
3. Add tags to presets for easier searching
4. Set up automatic backups
5. Monitor storage usage
6. Handle errors gracefully

## See Full Documentation

For complete API reference and advanced features, see:
`/INDEXEDDB_IMPLEMENTATION.md`
