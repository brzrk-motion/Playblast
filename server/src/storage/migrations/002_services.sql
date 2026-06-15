-- Migration 002: services catalog
-- Safe to run on databases created before services were introduced.
-- Fresh installs receive the same DDL from schema.sql; this migration is idempotent.
--
-- Delete strategy: hard delete. Services are a standalone catalog with no foreign-key
-- dependents; DELETE /api/services/:id removes the row permanently.

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
