import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { upsertAndGetUser } from './db.js';

passport.serializeUser((user, done) => {
  done(null, { id: user.id, provider: user.provider, provider_id: user.provider_id });
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://averroes.cloud/auth/google/callback',
    scope: ['profile', 'email']
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || '';
    const user = upsertAndGetUser({
      email,
      name: profile.displayName || '',
      provider: 'google',
      provider_id: profile.id,
      avatar_url: profile.photos?.[0]?.value || ''
    });
    done(null, user);
  }));
}

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'https://averroes.cloud/auth/github/callback',
    scope: ['user:email']
  }, (accessToken, refreshToken, profile, done) => {
    const email = profile.emails?.[0]?.value || profile._json?.email || '';
    const user = upsertAndGetUser({
      email,
      name: profile.displayName || profile.username || '',
      provider: 'github',
      provider_id: String(profile.id),
      avatar_url: profile.photos?.[0]?.value || ''
    });
    done(null, user);
  }));
}

export default passport;
