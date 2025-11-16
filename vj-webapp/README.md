# VJ WebApp 🎬✨

A professional, browser-based VJ (Video Jockey) software with WebGL rendering, YouTube integration, MIDI control, and audio reactivity. Built with React, TypeScript, and Three.js.

![VJ WebApp](https://img.shields.io/badge/VJ-WebApp-5a018d?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)

## ✨ Features

### 🎥 Video Mixing
- **Multi-layer video playback** (2-4 simultaneous layers)
- **YouTube integration** with prebuffering to avoid ads
- **Local video file support**
- **11 blend modes**: Normal, Multiply, Screen, Overlay, Add, Subtract, Difference, Lighten, Darken, Color-Dodge, Color-Burn
- **Real-time WebGL rendering** at 60fps

### 🎨 Effects & Shaders
- **17 built-in effects**:
  - Color: Brightness, Contrast, Saturation, Hue
  - Spatial: Blur, Pixelate, Kaleidoscope, Mirror
  - Stylization: Edge Detect, Posterize, Bloom
  - Retro: VHS, CRT, Glitch
  - Advanced: Chroma Key, Feedback, RGB Shift
- **Custom GLSL shader editor** with Monaco
- **Effect chaining** with pipeline system
- **Real-time parameter control**

### 🎵 Audio Reactivity
- **Web Audio API integration**
- **Frequency analysis** (bass, mid, treble)
- **BPM detection** with tap tempo
- **Beat-synced effects**
- **Audio-to-parameter mapping**

### 🎹 MIDI Controller Support
- **Web MIDI API** integration
- **MIDI Learn Mode** - click parameter, move control to map
- **Multiple device support**
- **CC value mapping** (0-127 → custom ranges)
- **Import/export mappings**

### 🎬 Transitions
- **10 transition types**: Crossfade, Wipe (H/V/D/C), Zoom, Rotate, Glitch, Pixelate
- **Easing functions**: Linear, Ease In/Out/In-Out, Cubic Bezier
- **Duration control** (100ms - 5000ms)
- **Real-time preview**

### 💾 Recording
- **Canvas stream capture**
- **MediaRecorder API**
- **Quality presets**: Low, Medium, High, Ultra
- **30/60 FPS support**
- **WebM format** (VP9/VP8/H.264)

### ⌨️ Keyboard Shortcuts
- **30+ shortcuts** for all major functions
- **Play/Pause**: `Space`
- **Layers**: `1-9` to select, `L`/`K` to navigate
- **Recording**: `R` to start/stop
- **Help modal**: `/` to view all shortcuts

### 💾 Preset System
- **IndexedDB storage** for persistence
- **Save/load presets** (effects, scenes, shaders)
- **Export/import** as JSON
- **Automatic backups**
- **Thumbnail previews**

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern browser (Chrome, Firefox, Edge recommended)
- Optional: MIDI controller

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd vj-webapp

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Usage

1. **Add video**: Click "Videos" tab, paste YouTube URL or upload local file
2. **Apply effects**: Select layer, open "Effects" tab, add effects
3. **Mix layers**: Adjust opacity and blend modes in layer panel
4. **Record**: Click record button in bottom controls
5. **Keyboard shortcuts**: Press `/` to view all shortcuts

## 🎹 MIDI Setup

1. **Connect MIDI controller** to your computer
2. **Enable MIDI Learn Mode**: Click `M` or the MIDI icon
3. **Map parameters**: Click a parameter, move MIDI control
4. **Save mappings**: Mappings persist in IndexedDB

### Recommended Controllers
- Akai APC Mini
- Novation Launchpad
- Behringer X-Touch Mini
- Korg nanoKONTROL2

## 🎨 Custom Shaders

Create custom GLSL shaders:
1. Click "Shader Editor" button
2. Choose a template or write from scratch
3. Edit GLSL code with live preview
4. Adjust uniforms with auto-generated controls
5. Save as preset

## 📦 Building for Production

```bash
# Build optimized production bundle
npm run build

# Preview production build
npm run preview
```

Build output: `dist/` directory

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### GitHub Pages

```bash
# Build
npm run build

# Deploy dist/ to gh-pages branch
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

## 🎮 Controls Reference

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `1-9` | Select layer |
| `L` / `K` | Navigate layers |
| `↑` / `↓` | Adjust opacity |
| `O` | Toggle visibility |
| `B` | Cycle blend modes |
| `E` | Open effects |
| `R` | Start/stop recording |
| `S` | Save preset |
| `M` | MIDI learn mode |
| `F` | Fullscreen |
| `/` | Show shortcuts |

### Mouse Controls
- **Click layer** to select
- **Drag opacity slider** to adjust
- **Click effect** to add/remove
- **Drag parameters** for fine control

## 📚 Documentation

- [Audio & MIDI Guide](./AUDIO_MIDI_GUIDE.md)
- [Audio & MIDI Quick Start](./AUDIO_MIDI_QUICK_START.md)
- [IndexedDB Implementation](./INDEXEDDB_IMPLEMENTATION.md)
- [Keyboard Shortcuts](./KEYBOARD_SHORTCUTS_SUMMARY.md)
- [Shader System](./src/shaders/README.md)
- [Usage Guide](./USAGE.md)

## 🏗️ Architecture

```
src/
├── components/       # React UI components
├── engine/          # WebGL rendering engine
├── hooks/           # React hooks
├── shaders/         # GLSL shaders
├── store/           # Zustand state management
├── types/           # TypeScript types
└── utils/           # Utility functions
```

### Tech Stack
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Three.js** - WebGL rendering
- **React Three Fiber** - React renderer for Three.js
- **Zustand** - State management
- **IndexedDB (idb)** - Local storage
- **Monaco Editor** - Code editor
- **Web APIs**: YouTube IFrame, Web Audio, Web MIDI, MediaRecorder

## 🎨 Design

- **Font**: Exo 2
- **Primary Color**: `#5a018d` (Purple)
- **Secondary Color**: `#00d9ff` (Cyan)
- **Theme**: Dark mode only

## 🐛 Troubleshooting

### YouTube videos not loading
- Check browser console for CORS errors
- Some videos may be restricted from embedding
- Try different videos or use local files

### MIDI not working
- **Chrome/Edge**: Full support
- **Firefox**: Enable `dom.webmidi.enabled` in `about:config`
- **Safari**: Not supported
- Check MIDI device is connected and browser has permission

### Poor performance
- Reduce number of active layers
- Disable some effects
- Lower canvas resolution
- Close other browser tabs
- Update GPU drivers

### Recording not working
- Check browser supports MediaRecorder API
- Ensure sufficient disk space
- Try lower quality preset
- Check browser permissions for recording

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Vite](https://vitejs.dev/)
- WebGL rendering powered by [Three.js](https://threejs.org/)
- UI components styled with CSS Modules
- GLSL shaders inspired by Shadertoy and professional VJ software

## 📧 Support

For questions or issues, please open a GitHub issue.

---

**Made with 💜 by the VJ WebApp team**
