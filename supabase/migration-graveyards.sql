-- Run in Supabase SQL editor to add multi-graveyard support
ALTER TABLE graves ADD COLUMN IF NOT EXISTS graveyard_id TEXT NOT NULL DEFAULT 'uol-main';
ALTER TABLE grave_bookings ADD COLUMN IF NOT EXISTS graveyard_id TEXT NOT NULL DEFAULT 'uol-main';
CREATE INDEX IF NOT EXISTS idx_graves_graveyard ON graves (graveyard_id);

-- Existing graves stay at UOL Campus Graveyard
UPDATE graves SET graveyard_id = 'uol-main' WHERE graveyard_id IS NULL OR graveyard_id = '';
