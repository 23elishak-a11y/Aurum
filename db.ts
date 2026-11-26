import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), ".data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "aurum.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active', progress INTEGER NOT NULL DEFAULT 0,
    color TEXT NOT NULL DEFAULT '#d6b36a', icon TEXT NOT NULL DEFAULT 'project',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
    folder TEXT NOT NULL DEFAULT 'Personal', project_id TEXT, tags TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open', priority TEXT NOT NULL DEFAULT 'normal',
    due_at INTEGER, project_id TEXT, created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
    starts_at INTEGER NOT NULL, ends_at INTEGER, project_id TEXT, kind TEXT NOT NULL DEFAULT 'event',
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, action TEXT NOT NULL, application TEXT NOT NULL,
    description TEXT NOT NULL, project_id TEXT, created_at INTEGER NOT NULL,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info', read INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, state TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft', category TEXT NOT NULL DEFAULT 'Uncategorised',
    citations TEXT NOT NULL DEFAULT '[]', updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY, label TEXT NOT NULL, data TEXT NOT NULL, created_at INTEGER NOT NULL
  );
`);

const count = db.prepare("SELECT COUNT(*) AS count FROM workspaces").get() as { count: number };
if (count.count === 0) {
  db.prepare("INSERT INTO workspaces (id,name,state,updated_at) VALUES (?,?,?,?)")
    .run("primary", "Primary", "{}", Date.now());
}

export default db;
