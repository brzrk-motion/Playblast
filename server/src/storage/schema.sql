PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  client TEXT,
  description TEXT,
  startDate TEXT,
  endDate TEXT,
  budget TEXT
);

CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  dueDate TEXT,
  createdAt TEXT NOT NULL,
  "order" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dueDate TEXT,
  done INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS versions (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  deliverableId TEXT NOT NULL REFERENCES deliverables(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  filename TEXT NOT NULL,
  uploadedAt TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE(deliverableId, label)
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  versionId TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
  timestamp REAL NOT NULL,
  body TEXT NOT NULL,
  author TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0,
  annotation TEXT
);

CREATE INDEX IF NOT EXISTS idx_deliverables_projectId ON deliverables(projectId);
CREATE INDEX IF NOT EXISTS idx_milestones_projectId ON milestones(projectId);
CREATE INDEX IF NOT EXISTS idx_versions_deliverableId ON versions(deliverableId);
CREATE INDEX IF NOT EXISTS idx_versions_projectId ON versions(projectId);
CREATE INDEX IF NOT EXISTS idx_comments_versionId ON comments(versionId);
