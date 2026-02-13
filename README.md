# AVERROES.CLOUD Landing Page

Futuristic landing page with Three.js particle effects and interactive 404 game.

## 🎨 Features

### Landing Page (`index.html`)
- **Three.js 3D particle field** - Networked particle system
- **WebGL shaders** - Custom glow effects
- **GSAP animations** - Smooth UI transitions
- **Login interface** - Cyberpunk/futuristic design
- **Service grid** - Links to all your projects

### 404 Page (`404.html`)
- **Space shooter game** - Defend the system!
- **Canvas2D retro graphics** - Neon aesthetic
- **Score tracking** - Wave progression
- **Particle explosions** - Satisfying effects

## 🔤 Custom Fonts

Place your futuristic fonts in the `/fonts/` directory:

```
/fonts/
  ├── YourFont-Regular.woff2
  ├── YourFont-Bold.woff2
  └── YourFont.css
```

**Recommended futuristic fonts:**
- Orbitron
- Rajdhani
- Share Tech Mono
- Audiowide
- Exo 2
- Michroma

Or provide your custom font files!

## 🚀 Setup

```bash
# Install dependencies
cd ~/averroes-landing
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

## 📦 Deploy to ZimaBoard

### Option 1: Direct Copy
```bash
# Build
npm run build

# Transfer to ZimaBoard
rsync -avz --delete -e "ssh -i ~/.ssh/id_ed25519" \
  dist/ Home-Lab@192.168.3.34:/tmp/averroes-landing/
```

### Option 2: Docker + Cloudflare Tunnel

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  landing:
    image: nginx:alpine
    container_name: averroes-landing
    volumes:
      - /tmp/averroes-landing:/usr/share/nginx/html
    ports:
      - "3003:80"
    restart: unless-stopped

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: landing-tunnel
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    restart: unless-stopped
```

## 🌐 Cloudflare Tunnel Setup

1. **Create new tunnel** for main domain:
   ```
   Tunnel name: averroes-landing
   Public hostname: averroes.cloud
   Service: HTTP → landing:80
   ```

2. **Add DNS in Hostinger:**
   ```
   Type:  CNAME
   Name:  @ (root domain)
   Value: [new-tunnel-id].cfargotunnel.com
   ```

## 🎮 404 Game Controls

- **← →** or **A D** - Move ship
- **SPACE** - Fire
- Destroy enemies to increase score
- Every 100 points = new wave (harder)
- Don't let enemies hit you!

## 🎨 Customization

### Colors
Edit CSS variables in `index.html` or create `src/styles.css`:
```css
:root {
  --primary: #0ff;     /* Cyan */
  --secondary: #0aa;   /* Dark cyan */
  --danger: #f00;      /* Red */
  --success: #0f0;     /* Green */
}
```

### Particle Count
In `index.html`, adjust:
```javascript
const particleCount = 100; // Increase for more particles
```

### Game Difficulty
In `404.html`, adjust:
```javascript
let enemySpeed = 2;       // Initial speed
const bulletSpeed = 8;    // Bullet speed
let health = 100;         // Starting health
```

## 📁 Project Structure

```
averroes-landing/
├── index.html          # Main landing page (Three.js)
├── 404.html            # Error page with game
├── package.json        # Dependencies
├── vite.config.js      # Build config
├── fonts/              # Custom fonts here
├── src/                # Source files (if needed)
└── dist/               # Built files (generated)
```

## 🔗 Integration with Archie

The landing page links to:
- https://archie.averroes.cloud - AI Face
- Dashboard (coming soon)
- Portfolio (coming soon)
- Lab (coming soon)

## 🎯 Future Enhancements

- [ ] Three.js shader effects (galaxy, nebula)
- [ ] Sound effects for game
- [ ] Leaderboard (high scores)
- [ ] Mobile touch controls
- [ ] VR mode for landing page
- [ ] More games (Snake, Asteroids, etc.)

---

**Ready to deploy!** Just provide your font files.
