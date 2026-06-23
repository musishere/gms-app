-- ─────────────────────────────────────────────────────────────────────────────
-- GMS (Graveyard Management System) — Supabase Schema
-- Run this in the Supabase SQL editor before starting the app.
-- ─────────────────────────────────────────────────────────────────────────────

-- Profiles (extends auth.users with app-specific fields)
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         TEXT NOT NULL DEFAULT 'family' CHECK (role IN ('admin', 'staff', 'family')),
  phone        TEXT DEFAULT '',
  cnic         TEXT DEFAULT '',
  address      TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Graves
CREATE TABLE IF NOT EXISTS graves (
  id                     TEXT PRIMARY KEY,
  graveyard_id           TEXT NOT NULL DEFAULT 'uol-main',
  grave_number           TEXT NOT NULL UNIQUE,
  section                TEXT NOT NULL,
  row                    INTEGER NOT NULL,
  grave_col              INTEGER NOT NULL,   -- 'column' is a reserved keyword
  latitude               DOUBLE PRECISION,
  longitude              DOUBLE PRECISION,
  status                 TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','maintenance')),
  size                   TEXT NOT NULL DEFAULT 'standard' CHECK (size IN ('standard','child','double','vip')),
  price                  NUMERIC NOT NULL,
  occupied_by            TEXT,
  burial_id              TEXT,
  last_maintenance_date  TIMESTAMPTZ,
  notes                  TEXT,
  reserved_until         TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Burials
CREATE TABLE IF NOT EXISTS burials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grave_id         TEXT REFERENCES graves(id),
  deceased         JSONB NOT NULL,            -- stores the Deceased object as-is
  burial_date      DATE NOT NULL,
  burial_time      TEXT NOT NULL,
  conducted_by     TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes            TEXT DEFAULT '',
  booking_user_id  UUID REFERENCES profiles(id),
  qr_code          TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  burial_id        UUID REFERENCES burials(id),
  grave_id         TEXT REFERENCES graves(id),
  user_id          UUID REFERENCES profiles(id),
  amount           NUMERIC NOT NULL,
  method           TEXT NOT NULL DEFAULT 'cash' CHECK (method IN ('cash','online','bank_transfer','cheque')),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','waived')),
  transaction_ref  TEXT,
  paid_at          TIMESTAMPTZ,
  due_date         TIMESTAMPTZ,
  receipt_number   TEXT NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Death Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  burial_id           UUID REFERENCES burials(id),
  deceased_name       TEXT NOT NULL,
  issued_to           TEXT NOT NULL,
  requested_by        UUID REFERENCES profiles(id),
  certificate_number  TEXT NOT NULL UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','rejected')),
  issued_at           TIMESTAMPTZ,
  notes               TEXT,
  verification_code   TEXT UNIQUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance Requests
CREATE TABLE IF NOT EXISTS maintenance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grave_id     TEXT REFERENCES graves(id),
  grave_number TEXT,
  section      TEXT,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  reported_by  UUID REFERENCES profiles(id),
  assigned_to  TEXT,
  resolved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Grave Bookings (slot reservations prior to full burial records)
CREATE TABLE IF NOT EXISTS grave_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graveyard_id  TEXT NOT NULL DEFAULT 'uol-main',
  grave_id      TEXT REFERENCES graves(id),
  booked_by     UUID REFERENCES profiles(id),
  slot_date     DATE NOT NULL,
  slot_time     TEXT NOT NULL,
  deceased_name TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  deceased      JSONB,
  notes         TEXT DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','cancelled','converted')),
  approved_by   UUID REFERENCES profiles(id),
  approved_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id),
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','error')),
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE graves          ENABLE ROW LEVEL SECURITY;
ALTER TABLE burials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance     ENABLE ROW LEVEL SECURITY;
ALTER TABLE grave_bookings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications   ENABLE ROW LEVEL SECURITY;

-- The service-role key used by the Next.js API routes bypasses RLS automatically.
-- These policies allow the anon/authenticated keys (browser client) read access
-- where needed, and full access to authenticated users.

CREATE POLICY "Authenticated read graves"       ON graves        FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read burials"      ON burials       FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read payments"     ON payments      FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read certificates" ON certificates  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated read maintenance"  ON maintenance      FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own bookings read"               ON grave_bookings   FOR SELECT TO authenticated USING (booked_by = auth.uid());
CREATE POLICY "Own bookings insert"             ON grave_bookings   FOR INSERT TO authenticated WITH CHECK (booked_by = auth.uid());
CREATE POLICY "Own profile read"                ON profiles      FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Own notifications read"          ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_burials_deceased_name ON burials ((deceased->>'name'));
CREATE INDEX IF NOT EXISTS idx_burials_burial_date ON burials (burial_date);
CREATE INDEX IF NOT EXISTS idx_graves_graveyard ON graves (graveyard_id);

-- ─── Seed: 390 graves across sections A, B, C, D, VIP ────────────────────────
-- Run the companion seed-graves.sql file (or call /api/setup/graves once) to
-- populate the graves table with the initial layout.
