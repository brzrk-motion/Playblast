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
