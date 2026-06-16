CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  milestoneId TEXT NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_milestoneId ON tasks(milestoneId);

CREATE TABLE IF NOT EXISTS time_logs (
  id TEXT PRIMARY KEY,
  taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  durationHours REAL NOT NULL CHECK (durationHours > 0),
  loggedAt TEXT NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_time_logs_taskId ON time_logs(taskId);
