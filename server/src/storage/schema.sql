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
  isRetainer INTEGER NOT NULL DEFAULT 0,
  retainerHours REAL,
  retainerRate REAL,
  retainerCycleDay INTEGER,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS retainer_cycle_hours (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  cycleStart TEXT NOT NULL,
  hoursLogged REAL NOT NULL DEFAULT 0 CHECK (hoursLogged >= 0),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE (clientId, cycleStart)
);

CREATE INDEX IF NOT EXISTS idx_retainer_cycle_hours_clientId
  ON retainer_cycle_hours(clientId);

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
-- idx_projects_clientId is created by the migration runner (see migrations/001 and db.ts):
-- projects.clientId is added by migration on legacy databases, so the index cannot live
-- here without crashing schema load on databases that predate client management.
CREATE INDEX IF NOT EXISTS idx_deliverables_projectId ON deliverables(projectId);
CREATE INDEX IF NOT EXISTS idx_milestones_projectId ON milestones(projectId);
CREATE INDEX IF NOT EXISTS idx_versions_deliverableId ON versions(deliverableId);
CREATE INDEX IF NOT EXISTS idx_versions_projectId ON versions(projectId);
CREATE INDEX IF NOT EXISTS idx_comments_versionId ON comments(versionId);

-- Services catalog (hard delete; see migrations/002_services.sql)
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hourEstimate REAL NOT NULL,
  hourlyRate REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('static', 'animated')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_services_type ON services(type);

CREATE TABLE IF NOT EXISTS project_services (
  id TEXT PRIMARY KEY,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  serviceId TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  overrideHours REAL,
  createdAt TEXT NOT NULL,
  UNIQUE (projectId, serviceId)
);

CREATE INDEX IF NOT EXISTS idx_project_services_serviceId ON project_services(serviceId);
CREATE INDEX IF NOT EXISTS idx_project_services_projectId ON project_services(projectId);

-- Invoices with payment tracking (see migrations/006_invoices.sql)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoiceNumber INTEGER NOT NULL UNIQUE,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  projectName TEXT NOT NULL,
  clientName TEXT NOT NULL,
  clientCompany TEXT,
  clientEmail TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  grandTotal REAL NOT NULL CHECK (grandTotal > 0),
  lineItems TEXT NOT NULL,
  invoiceDate TEXT NOT NULL,
  dueDate TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id TEXT PRIMARY KEY,
  invoiceId TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount REAL NOT NULL CHECK (amount > 0),
  paidAt TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_projectId ON invoices(projectId);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoiceId ON invoice_payments(invoiceId);
