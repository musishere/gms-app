-- Add full deceased details to grave bookings (mirrors burials.deceased JSONB)
ALTER TABLE grave_bookings ADD COLUMN IF NOT EXISTS deceased JSONB;

-- Backfill from legacy columns
UPDATE grave_bookings
SET deceased = jsonb_build_object(
  'name', deceased_name,
  'nextOfKin', contact_name,
  'nextOfKinPhone', contact_phone
)
WHERE deceased IS NULL;
