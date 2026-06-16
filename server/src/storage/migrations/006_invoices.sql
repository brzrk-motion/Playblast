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
  grandTotal REAL NOT NULL,
  lineItems TEXT NOT NULL,
  invoiceDate TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invoices_projectId ON invoices(projectId);
