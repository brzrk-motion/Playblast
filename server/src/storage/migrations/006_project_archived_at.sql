UPDATE projects
SET archived_at = datetime('now')
WHERE status = 'archived' AND archived_at IS NULL;

UPDATE projects
SET status = 'completed'
WHERE status = 'archived';
