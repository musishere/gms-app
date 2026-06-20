Applying DB migration for booking fields

This project added new columns to `grave_bookings` to store additional deceased details used when converting bookings to burials.

Files:
- `supabase/migrations/20260620_add_booking_fields.sql` — idempotent SQL to add columns and indexes.

How to apply
1. Supabase SQL editor (recommended):
   - Open your Supabase project → SQL Editor → New query.
   - Paste the contents of `supabase/migrations/20260620_add_booking_fields.sql` and run.

2. psql (if you have DB access):
   ```bash
   psql "<CONN_STRING>" -f supabase/migrations/20260620_add_booking_fields.sql
   ```

Notes
- The migration is idempotent (uses `ADD COLUMN IF NOT EXISTS`).
- After applying the migration, restart the Next dev server so the API can select the new columns without falling back.
- If you do not apply the migration, the server will continue to run — the API contains a fallback to the older booking column list, but the booking creation endpoint will still attempt to insert the new columns (the insert will fail if DB lacks them). To avoid insert failures, apply the migration before creating bookings that include the new fields.
