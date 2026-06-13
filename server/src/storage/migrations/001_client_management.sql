-- Migration 001: client management module
-- Safe to run on databases created before client management was introduced.
-- Fresh installs receive the same DDL from schema.sql; this migration is idempotent.

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

-- projects.clientId is added by the migration runner when the column is missing.

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_contact_log_leadId ON contact_log(leadId);
CREATE INDEX IF NOT EXISTS idx_clients_convertedFromLeadId ON clients(convertedFromLeadId);
-- idx_projects_clientId is created after projects.clientId is added (see db.ts).
