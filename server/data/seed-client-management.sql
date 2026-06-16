-- Dev seed data for the client management module.
-- Loaded by scripts/seed-client-management.js (skipped when leads already exist).

INSERT INTO leads (
  id, name, company, email, phone, source, status, notes,
  lastContactedAt, replied, createdAt, updatedAt
) VALUES
  (
    'lead-seed-001',
    'Jordan Ellis',
    'Northlight Studio',
    'jordan@northlight.studio',
    '+1-555-0101',
    'Referral',
    'negotiating',
    'Interested in a product launch film package.',
    '2026-06-10T14:30:00.000Z',
    1,
    '2026-06-01T09:00:00.000Z',
    '2026-06-10T14:30:00.000Z'
  ),
  (
    'lead-seed-002',
    'Sam Rivera',
    'Drift Agency',
    'sam@drift.agency',
    NULL,
    'Instagram',
    'contacted',
    'Reached out after seeing the BRZRK reel.',
    '2026-06-08T11:00:00.000Z',
    0,
    '2026-06-05T16:20:00.000Z',
    '2026-06-08T11:00:00.000Z'
  ),
  (
    'lead-seed-003',
    'Alex Chen',
    'Orbit Labs',
    'alex@orbitlabs.io',
    '+1-555-0199',
    'Cold Outreach',
    'converted',
    'Converted after Q1 pitch.',
    '2026-05-20T10:00:00.000Z',
    1,
    '2026-05-01T08:00:00.000Z',
    '2026-05-21T09:15:00.000Z'
  );

INSERT INTO contact_log (
  id, leadId, type, notes, contactedAt, createdAt
) VALUES
  (
    'clog-seed-001',
    'lead-seed-001',
    'email',
    'Sent portfolio link and rate card.',
    '2026-06-03T10:00:00.000Z',
    '2026-06-03T10:05:00.000Z'
  ),
  (
    'clog-seed-002',
    'lead-seed-001',
    'call',
    '30-min discovery call; budget range discussed.',
    '2026-06-10T14:30:00.000Z',
    '2026-06-10T14:35:00.000Z'
  ),
  (
    'clog-seed-003',
    'lead-seed-002',
    'email',
    'Intro email with case studies.',
    '2026-06-08T11:00:00.000Z',
    '2026-06-08T11:02:00.000Z'
  );

INSERT INTO clients (
  id, name, company, email, phone, website, notes,
  convertedFromLeadId, isRetainer, retainerHours, retainerRate,
  retainerCycleDay, createdAt, updatedAt
) VALUES
  (
    'client-seed-001',
    'Alex Chen',
    'Orbit Labs',
    'alex@orbitlabs.io',
    '+1-555-0199',
    'https://orbitlabs.io',
    'Active retainer client.',
    'lead-seed-003',
    1,
    40,
    175,
    1,
    '2026-05-21T09:15:00.000Z',
    '2026-05-21T09:15:00.000Z'
  );

-- Link the first project to the seeded client when present (no-op otherwise).
UPDATE projects
SET clientId = 'client-seed-001'
WHERE id = (SELECT id FROM projects ORDER BY createdAt ASC LIMIT 1)
  AND clientId IS NULL;
