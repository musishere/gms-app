-- Add deceased JSONB to grave_bookings (stores full form: CNIC, address, religion, etc.)
ALTER TABLE grave_bookings ADD COLUMN IF NOT EXISTS deceased JSONB;

-- Backfill existing rows from legacy contact columns
UPDATE grave_bookings
SET deceased = jsonb_build_object(
  'name', deceased_name,
  'nextOfKin', contact_name,
  'nextOfKinPhone', contact_phone
)
WHERE deceased IS NULL;
