-- Migration: add deceased fields to grave_bookings (idempotent)
ALTER TABLE IF EXISTS grave_bookings
  ADD COLUMN IF NOT EXISTS deceased_cnic TEXT DEFAULT '';

ALTER TABLE IF EXISTS grave_bookings
  ADD COLUMN IF NOT EXISTS date_of_death DATE;

ALTER TABLE IF EXISTS grave_bookings
  ADD COLUMN IF NOT EXISTS cause_of_death TEXT DEFAULT '';

ALTER TABLE IF EXISTS grave_bookings
  ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';

-- Add indexes to help searching by deceased name / cnic
CREATE INDEX IF NOT EXISTS idx_grave_bookings_deceased_name ON grave_bookings (deceased_name);
CREATE INDEX IF NOT EXISTS idx_grave_bookings_deceased_cnic ON grave_bookings (deceased_cnic);

-- End migration
