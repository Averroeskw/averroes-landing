import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import passport from './passport.js';
import { listUsers } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const ARCHIE_URL = process.env.ARCHIE_URL || 'https://archie.averroes.cloud';

// Trust Cloudflare tunnel proxy
app.set('trust proxy', 1);

// Compression
app.use(compression());

// Security headers with CSP
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://apis.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss://archie.averroes.cloud"],
      frameSrc: ["https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: []
    }
  }
}));

// Rate limiting - general
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' }
}));

// Rate limiting - stricter on auth
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, try again later' }
}));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Auth check helper
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/?error=login_required');
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- OAuth Routes ---

// Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/?error=google_auth_failed' }),
  (req, res) => {
    console.log(`[ARCHIE] Google login: ${req.user.email}`);
    const token = generateToken(req.user);
    res.redirect(`${ARCHIE_URL}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(req.user.email)}`);
  }
);

// GitHub
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/?error=github_auth_failed' }),
  (req, res) => {
    console.log(`[ARCHIE] GitHub login: ${req.user.email}`);
    const token = generateToken(req.user);
    res.redirect(`${ARCHIE_URL}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(req.user.email)}`);
  }
);

// Logout
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Auth status API (for frontend to check)
app.get('/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: { email: req.user.email, name: req.user.name } });
  } else {
    res.json({ authenticated: false });
  }
});

// --- Protected service routes ---

app.get('/service/core', requireAuth, (req, res) => {
  const token = generateToken(req.user);
  res.redirect(`${ARCHIE_URL}?token=${encodeURIComponent(token)}&user=${encodeURIComponent(req.user.email)}`);
});

app.get('/service/:name', requireAuth, (req, res) => {
  res.status(503).json({ error: `Module "${req.params.name}" is not yet available` });
});

// --- Admin API ---

app.get('/admin/users', (req, res) => {
  const authHeader = req.headers.authorization;
  const password = authHeader?.replace('Bearer ', '');

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const users = listUsers();
  res.json({ total: users.length, users });
});

// --- SEO & Legal ---

app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(
`User-agent: *
Disallow: /`
  );
});

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://averroes.cloud/</loc>
    <lastmod>2026-02-14</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://averroes.cloud/privacy</loc>
    <lastmod>2026-02-13</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`
  );
});

app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy // ARCHIE AI</title>
  <style>
    @font-face {
      font-family: 'Morphesd';
      src: url('/fonts/Morphesd-Regular.otf') format('opentype'),
           url('/fonts/Morphesd-Regular.ttf') format('truetype');
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Morphesd', 'Courier New', monospace;
      background: #000; color: #0aa;
      padding: 40px 20px; max-width: 800px; margin: 0 auto;
      line-height: 1.8;
    }
    h1 { color: #0ff; font-size: 2rem; letter-spacing: 6px; margin-bottom: 30px;
         text-shadow: 0 0 10px rgba(0,255,255,0.5); }
    h2 { color: #0ff; font-size: 1.2rem; letter-spacing: 3px; margin: 25px 0 10px;
         border-bottom: 1px solid rgba(0,255,255,0.3); padding-bottom: 5px; }
    p { margin-bottom: 12px; font-size: 0.95rem; }
    a { color: #0ff; }
    .back { display: inline-block; margin-bottom: 30px; color: #0ff;
            text-decoration: none; letter-spacing: 2px; font-size: 0.85rem; }
    .back:hover { text-shadow: 0 0 10px #0ff; }
    .updated { font-size: 0.8rem; color: #077; margin-top: 30px; }
  </style>
</head>
<body>
  <a href="/" class="back">&lt; RETURN TO TERMINAL</a>
  <h1>PRIVACY POLICY</h1>

  <h2>DATA COLLECTED</h2>
  <p>When you authenticate via Google or GitHub, we collect your name, email address,
  and profile photo URL as provided by the OAuth provider. We also record login timestamps.</p>

  <h2>HOW DATA IS USED</h2>
  <p>Your data is used solely to authenticate access to ARCHIE AI services.
  We do not sell, share, or distribute your personal information to third parties.</p>

  <h2>DATA STORAGE</h2>
  <p>Your information is stored in an encrypted database on our private infrastructure.
  Data is retained for the duration of your account. No data is transferred to external analytics or advertising services.</p>

  <h2>THIRD-PARTY SERVICES</h2>
  <p>Authentication is handled via Google OAuth 2.0 and GitHub OAuth. These services have their own privacy policies.
  Our domain is proxied through Cloudflare for security and performance.</p>

  <h2>COOKIES</h2>
  <p>We use a single session cookie for authentication. It is strictly necessary, HttpOnly, and Secure.
  No tracking or analytics cookies are used.</p>

  <h2>YOUR RIGHTS</h2>
  <p>You may request access to, correction of, or deletion of your personal data at any time
  by contacting us at the email below.</p>

  <h2>CONTACT</h2>
  <p>For privacy inquiries: admin@averroes.cloud</p>

  <p class="updated">Last updated: February 2026</p>
</body>
</html>`);
});

// --- Static files (Vite build output) ---

const distPath = join(__dirname, '..', 'dist');

app.use('/assets', express.static(join(distPath, 'assets'), {
  maxAge: '1y',
  immutable: true
}));

app.use('/fonts', express.static(join(distPath, 'fonts'), {
  maxAge: '1y',
  immutable: true
}));

// Root-level static files (favicon, etc.)
app.use(express.static(distPath, {
  maxAge: '1d',
  index: false
}));

// Root serves index.html
app.get('/', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// 404 handler
app.use((req, res) => {
  res.status(404).sendFile(join(distPath, '404.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[ARCHIE] Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// --- Helpers ---

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ARCHIE] Server running on port ${PORT}`);
  console.log(`[ARCHIE] Static files: ${distPath}`);
  console.log(`[ARCHIE] Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'configured' : 'NOT configured'}`);
  console.log(`[ARCHIE] GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'configured' : 'NOT configured'}`);
});
