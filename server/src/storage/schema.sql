PRAGMA foreign_keys = ON;

-- Client management (see docs/client-management-schema.md)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'contacted', 'replied', 'negotiating', 'converted', 'lost')),
  notes TEXT,
  lastContactedAt TEXT,
  replied INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contact_log (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN ('email', 'call', 'meeting', 'note')),
  notes TEXT,
  contactedAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  notes TEXT,
  convertedFromLeadId TEXT REFERENCES leads(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  client TEXT,
  clientId TEXT REFERENCES clients(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_contact_log_leadId ON contact_log(leadId);
CREATE INDEX IF NOT EXISTS idx_clients_convertedFromLeadId ON clients(convertedFromLeadId);
CREATE INDEX IF NOT EXISTS idx_projects_clientId ON projects(clientId);
CREATE INDEX IF NOT EXISTS idx_deliverables_projectId ON deliverables(projectId);
CREATE INDEX IF NOT EXISTS idx_milestones_projectId ON milestones(projectId);
CREATE INDEX IF NOT EXISTS idx_versions_deliverableId ON versions(deliverableId);
CREATE INDEX IF NOT EXISTS idx_versions_projectId ON versions(projectId);
CREATE INDEX IF NOT EXISTS idx_comments_versionId ON comments(versionId);
