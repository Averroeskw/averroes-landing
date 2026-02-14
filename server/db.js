import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data');

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'users.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    name TEXT,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    avatar_url TEXT,
    first_login TEXT NOT NULL DEFAULT (datetime('now')),
    last_login TEXT NOT NULL DEFAULT (datetime('now')),
    login_count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(provider, provider_id)
  )
`);

const upsertUser = db.prepare(`
  INSERT INTO users (email, name, provider, provider_id, avatar_url, first_login, last_login, login_count)
  VALUES (@email, @name, @provider, @provider_id, @avatar_url, datetime('now'), datetime('now'), 1)
  ON CONFLICT(provider, provider_id) DO UPDATE SET
    email = @email,
    name = @name,
    avatar_url = @avatar_url,
    last_login = datetime('now'),
    login_count = login_count + 1
`);

const getAllUsers = db.prepare(`
  SELECT id, email, name, provider, avatar_url, first_login, last_login, login_count
  FROM users ORDER BY last_login DESC
`);

const getUserByProviderId = db.prepare(`
  SELECT * FROM users WHERE provider = @provider AND provider_id = @provider_id
`);

export function upsertAndGetUser({ email, name, provider, provider_id, avatar_url }) {
  upsertUser.run({ email, name, provider, provider_id, avatar_url: avatar_url || null });
  return getUserByProviderId.get({ provider, provider_id });
}

export function listUsers() {
  return getAllUsers.all();
}

export default db;
