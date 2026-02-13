# ARCHIE AI Landing Page - Deployment Guide

## 📍 File Locations

### Local Development
```
📁 /Users/averroes/averroes-landing/
├── src/main.js              # Three.js neural field effects
├── index.html               # Main landing page
├── 404.html                 # Space shooter error page
├── package.json             # Dependencies (three, gsap, vite)
├── vite.config.js           # Build configuration
├── nginx.conf               # Nginx web server config
├── docker-compose.yml       # Docker deployment config
└── public/
    ├── fonts/               # Stardock futuristic font
    └── assets/backgrounds/  # Geometric background images
```

### Production (ZimaBoard)
```
📁 /tmp/averroes-landing/    # Deployed static files
📦 Docker Container: averroes-landing
   - Image: nginx:alpine
   - Port: 3003:80
   - Restart: unless-stopped
```

## 🚀 Deployment Summary

### What's Running on Home Server (ZimaBoard @ 192.168.3.34)

| Container | Port | Purpose | URL |
|-----------|------|---------|-----|
| **averroes-landing** | 3003 | Landing Page (nginx) | https://averroes.cloud |
| **archie-ai-face** | 3002 | 3D AI Face | https://archie.averroes.cloud |
| **archie-tunnel** | - | Cloudflare Tunnel | Routes traffic |

### Cloudflare Tunnel Configuration

**Tunnel ID:** `19ba598f-74b8-448a-be9c-cfbec44830b1`
**Tunnel Name:** `archie-zimaboard`

**Routes:**
- `averroes.cloud` → `http://192.168.3.34:3003` (Landing Page)
- `archie.averroes.cloud` → `http://192.168.3.34:3002` (3D Face)

## 🔐 Authentication System

### Landing Page (averroes.cloud)
- **AI User ID:** 2021-2040 (numeric range)
- **Auth Token:** Averroes@2021
- **Storage:** localStorage (persistent)

### Protected Access
The 3D AI Face site (`archie.averroes.cloud`) requires authentication:
- Checks localStorage for `archie_auth_token`
- Redirects to `averroes.cloud` if not authenticated
- Must login on landing page first

## 🎨 Technical Features

### Three.js Neural Field
- 3,000 optimized particles
- Scattered distribution (50-150 radius)
- Custom GLSL shaders
- Mouse interaction effects

### Post-Processing Effects
- Bloom (0.8 strength)
- Chromatic aberration
- Film grain
- Vignette

### Other Features
- Stardock custom font
- GSAP animations
- Geometric backgrounds
- Responsive design
- 404 space shooter game

## 📦 Build & Deploy Commands

### Local Development
```bash
cd ~/averroes-landing
npm install
npm run dev  # Opens http://localhost:3000
```

### Production Build
```bash
npm run build  # Outputs to dist/
```

### Deploy to ZimaBoard
```bash
# Build
npm run build

# Transfer files
rsync -avz --delete dist/ Home-Lab@192.168.3.34:/tmp/averroes-landing/

# Update nginx config
scp nginx.conf Home-Lab@192.168.3.34:/tmp/nginx.conf

# Fix permissions
ssh Home-Lab@192.168.3.34 "chmod -R 755 /tmp/averroes-landing/"

# Restart container
ssh Home-Lab@192.168.3.34 "docker restart averroes-landing"
```

### Quick Deploy Script
```bash
npm run build && \
rsync -avz --delete dist/ Home-Lab@192.168.3.34:/tmp/averroes-landing/ && \
ssh Home-Lab@192.168.3.34 "chmod -R 755 /tmp/averroes-landing/ && docker restart averroes-landing"
```

## 🌐 Live URLs

- **Landing Page:** https://averroes.cloud
- **3D AI Face:** https://archie.averroes.cloud
- **Local Dev:** http://localhost:3000

## 🔧 Maintenance

### View Container Logs
```bash
ssh Home-Lab@192.168.3.34 "docker logs averroes-landing -f"
```

### Restart Container
```bash
ssh Home-Lab@192.168.3.34 "docker restart averroes-landing"
```

### Check Container Status
```bash
ssh Home-Lab@192.168.3.34 "docker ps | grep averroes-landing"
```

### Update Cloudflare Tunnel Routes
Go to: [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
→ Networks → Tunnels → archie-zimaboard → Public Hostname

## 📝 Git Repository

**Local repo initialized:** ✅
**Remote:** Not configured yet

To add remote and push:
```bash
git remote add origin <your-github-url>
git branch -M main
git push -u origin main
```

## 🎯 Next Steps

1. [ ] Configure DNS for averroes.cloud to point to Cloudflare Tunnel
2. [ ] Add GitHub remote and push code
3. [ ] Set up 404 page routing
4. [ ] Test authentication flow end-to-end
5. [ ] Add www subdomain support

---

**Last Updated:** 2026-02-13
**Deployed By:** Claude Code + Averroes
