-- Migration 003: project ↔ service associations
-- Safe to run on databases created before project_services were introduced.
-- Fresh installs receive the same DDL from schema.sql; this migration is idempotent.
--
-- Deleting a service cascades to project_services rows. Deleting a project cascades too.

CREATE TABLE IF NOT EXISTS project_services (
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  serviceId TEXT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL,
  PRIMARY KEY (projectId, serviceId)
);

CREATE INDEX IF NOT EXISTS idx_project_services_serviceId ON project_services(serviceId);
