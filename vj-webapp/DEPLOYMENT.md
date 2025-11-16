# Deployment Guide

This guide covers deploying the VJ WebApp to various platforms.

## Table of Contents

- [Quick Deploy](#quick-deploy)
- [Platform-Specific Guides](#platform-specific-guides)
  - [Vercel](#vercel-recommended)
  - [Netlify](#netlify)
  - [GitHub Pages](#github-pages)
  - [Docker](#docker)
  - [Self-Hosted](#self-hosted)
- [Environment Configuration](#environment-configuration)
- [Performance Optimization](#performance-optimization)

## Quick Deploy

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy)

## Platform-Specific Guides

### Vercel (Recommended)

Vercel provides the best performance and easiest deployment for Vite apps.

#### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Using Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your repository
4. Vercel auto-detects Vite configuration
5. Click "Deploy"

**Configuration:** `vercel.json` is already included in the project.

### Netlify

Netlify offers great CDN performance and easy rollbacks.

#### Using Netlify CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login to Netlify
netlify login

# Initialize Netlify site
netlify init

# Deploy
netlify deploy

# Deploy to production
netlify deploy --prod
```

#### Using Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [app.netlify.com](https://app.netlify.com)
3. Click "New site from Git"
4. Select your repository
5. Build settings are auto-detected from `netlify.toml`
6. Click "Deploy site"

**Configuration:** `netlify.toml` is already included in the project.

### GitHub Pages

Deploy to GitHub Pages for free static hosting.

#### Using GitHub Actions

1. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

2. Enable GitHub Pages in repository settings
3. Select `gh-pages` branch
4. Push to `main` to trigger deployment

#### Manual Deployment

```bash
# Build
npm run build

# Install gh-pages
npm i -g gh-pages

# Deploy
gh-pages -d dist
```

### Docker

Run in a Docker container for consistent environments.

#### Build and Run

```bash
# Build image
docker build -t vj-webapp .

# Run container
docker run -p 5173:5173 vj-webapp

# Access at http://localhost:5173
```

#### Using Docker Compose

```bash
# Start service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

#### Production Recommendations

```dockerfile
# Use nginx for production
FROM nginx:alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Self-Hosted

Host on your own server using Node.js or Nginx.

#### Using Node.js

```bash
# Build
npm run build

# Install serve globally
npm i -g serve

# Serve on port 3000
serve -s dist -p 3000
```

#### Using Nginx

1. Build the app:
```bash
npm run build
```

2. Copy `dist/` to `/var/www/vj-webapp`

3. Create Nginx config (`/etc/nginx/sites-available/vj-webapp`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/vj-webapp;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Cross-Origin-Embedder-Policy "require-corp";
    add_header Cross-Origin-Opener-Policy "same-origin";
}
```

4. Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/vj-webapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Environment Configuration

### Build Optimization

Update `vite.config.ts` for production:

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'react-vendor': ['react', 'react-dom'],
          'editor': ['@monaco-editor/react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
```

### Environment Variables

Create `.env.production`:

```env
VITE_APP_TITLE=VJ WebApp
VITE_API_URL=https://your-api.com
VITE_ENABLE_ANALYTICS=true
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Performance Optimization

### CDN Configuration

Use a CDN for static assets:
- Vercel: Automatic global CDN
- Netlify: Automatic global CDN
- Cloudflare Pages: Free global CDN

### Bundle Analysis

Analyze bundle size:

```bash
npm run build -- --mode analyze
```

### Compression

Enable Brotli compression:

```typescript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    viteCompression({ algorithm: 'brotliCompress' }),
  ],
});
```

### Cache Strategy

- **HTML**: No cache (always fresh)
- **JS/CSS**: Long cache with hash in filename
- **Assets**: 1 year cache

### Monitoring

Add monitoring:
- **Sentry**: Error tracking
- **Google Analytics**: Usage analytics
- **Vercel Analytics**: Web Vitals

## Troubleshooting

### Large Bundle Size

The app includes heavy dependencies (Three.js, Monaco). This is normal for WebGL apps.

**Solutions:**
- Enable lazy loading for Monaco editor
- Use dynamic imports for effects
- Enable code splitting

### CORS Issues with YouTube

Some YouTube videos may not load due to CORS restrictions.

**Solutions:**
- Use YouTube IFrame API (already implemented)
- Provide alternative video sources
- Fallback to local video uploads

### MIDI Not Working in Production

Web MIDI API requires HTTPS.

**Solutions:**
- Always deploy with HTTPS (Vercel/Netlify auto-enable)
- Use Let's Encrypt for self-hosted
- Test locally with `localhost` (MIDI works without HTTPS)

### Performance Issues

**Solutions:**
- Reduce active layers
- Disable unused effects
- Lower canvas resolution
- Use hardware acceleration
- Close other tabs

## Health Checks

Add health check endpoint:

```typescript
// src/health.ts
export const healthCheck = () => ({
  status: 'ok',
  timestamp: Date.now(),
  version: '1.0.0',
});
```

## Scaling

For high-traffic deployments:
- Use edge functions for API calls
- Enable CDN caching
- Add rate limiting
- Use Redis for session storage
- Add load balancer for multiple instances

## Backup & Rollback

### Vercel
- Automatic deployments for each commit
- One-click rollback to previous deployments
- Preview deployments for PRs

### Netlify
- Deploy previews for PRs
- Instant rollback in UI
- Deploy logs and history

---

For more help, see the [main README](./README.md) or open an issue.
