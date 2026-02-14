# AVERROES.CLOUD

Immersive 3D landing page and OAuth gateway for the ARCHIE AI ecosystem. Features a fullscreen morphing particle blob, glassmorphism UI, and a 404 space shooter game.

## Visual Architecture

The landing page is a fullscreen WebGL experience:

```
+--------------------------------------------------+
|  #hero-title (floating, pointer-events: none)     |
|     ARCHIE AI                                     |
|     AUTONOMOUS NEURAL INTERFACE                   |
|                                                   |
|         +-----------------------+                 |
|         |   Morphing Particle   |                 |
|         |   Blob (12K points)   |  <- WebGL canvas|
|         |   Sphere -> Torus ->  |                 |
|         |   Helix -> Icosahedron|                 |
|         +-----------------------+                 |
|                                                   |
|  +------------------------------------------+     |
|  |  #auth-panel (glassmorphism)              |     |
|  |  [ Authenticate with Google ]             |     |
|  |  [ Authenticate with GitHub ]             |     |
|  +------------------------------------------+     |
|                                                   |
|              AI CORE ONLINE  UTC 12:34:56         |
+--------------------------------------------------+
```

### Morphing Blob
- **12,000 particles** (5,000 on mobile) cycling through 4 shapes
- Shapes: Sphere (Fibonacci), Torus (parametric), Helix, Icosahedron
- Vertex shader: `mix(position, aPositionTarget, uProgress)` + simplex noise displacement
- Fragment shader: `0.05 / dist` bright-center glow
- GSAP morph cycle: `[pause 2s] -> [morph 3s] -> [pause 2s] -> ...`
- Mouse interaction: particles repel near cursor, blob tilts toward mouse

### Ambient Particles
- 600 tiny particles (300 mobile) in large sphere (r=20-80)
- Slow rotation, low opacity, gentle drift

### Post-Processing (Desktop Only)
- Bloom (strength 1.2)
- Chromatic aberration (0.002)
- Vignette (darkness 1.5)

### Entry Animation (GSAP)
1. Logo: blur -> clear (1.5s)
2. Subtitle: letterSpacing compress (1.2s)
3. Auth buttons: fade up (1.0s)
4. Status bar: fade in (0.8s)

## Server Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/` | GET | No | Landing page |
| `/auth/google` | GET | No | Google OAuth redirect |
| `/auth/google/callback` | GET | No | Google OAuth callback |
| `/auth/github` | GET | No | GitHub OAuth redirect |
| `/auth/github/callback` | GET | No | GitHub OAuth callback |
| `/service/:name` | GET | Yes | Protected service redirect |
| `/admin/users` | GET | Admin | List all users |
| `/404` | GET | No | Space shooter game |

### OAuth Flow
1. User clicks Google/GitHub button -> redirects to OAuth provider
2. Provider callback -> server creates/updates user in SQLite
3. Server generates JWT token
4. Redirect to `archie.averroes.cloud?token=JWT`

## Project Structure

```
averroes-landing/
  index.html              Immersive landing page (WebGL + overlay UI)
  404.html                Space shooter game (Canvas2D)
  src/
    main.js               ImmersiveLanding class (Three.js + GSAP)
  server/
    index.js              Express server (OAuth + static files)
    passport.js           Google + GitHub OAuth strategies
    db.js                 SQLite user database
    Dockerfile            Production container
  public/
    fonts/                Morphesd font files
    assets/backgrounds/   Background images (legacy, no longer used)
    favicon.svg           Site icon
  vite.config.js          Vite build config
  deploy.sh               One-command deploy to ZimaBoard
  docker-compose.yml      Container orchestration
  tunnel-config.yml       Cloudflare tunnel config
```

## OAuth Setup

### Environment Variables (`.env`)
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
SESSION_SECRET=...
JWT_SECRET=...
ARCHIE_URL=https://archie.averroes.cloud
```

### Google OAuth
1. Create project at console.cloud.google.com
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Authorized redirect URI: `https://averroes.cloud/auth/google/callback`

### GitHub OAuth
1. Settings -> Developer Settings -> OAuth Apps
2. Authorization callback URL: `https://averroes.cloud/auth/github/callback`

## Build & Deploy

```bash
# Development
npm install
npm run dev          # Vite dev server (frontend) + Express (backend)

# Production build
npm run build        # Output in dist/

# Deploy to ZimaBoard (one command)
./deploy.sh

# Manual deploy
rsync -avz --delete -e "ssh -i ~/.ssh/id_ed25519" \
  dist/ Home-Lab@192.168.3.34:/tmp/averroes-landing/dist/
ssh -i ~/.ssh/id_ed25519 Home-Lab@192.168.3.34 \
  "DOCKER_CONFIG=/tmp/.docker docker restart averroes-landing-v3"
```

## URLs

- **Public**: https://averroes.cloud
- **Local**: http://192.168.3.34:3003
- **Cloudflare Tunnel**: archie-zimaboard (tunnel ID: 19ba598f-...)

## 404 Game Controls

- Arrow keys or A/D: Move ship
- Space: Fire
- Destroy enemies, survive waves

## License

Private — all rights reserved.
