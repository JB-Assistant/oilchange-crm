-- =============================================================
-- OttoManagerPro: Phase 0 Migration
-- Run this ENTIRE script in the Supabase SQL editor before
-- deploying the updated application code.
--
-- What it does:
--   1. Adds clerk_org_id to public.orgs (bridge column)
--   2. Adds shop-level columns to otto.shops
--   3. Creates 11 missing otto schema tables
--   4. Enables RLS and grants on all new tables
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0a. Add clerk_org_id to public.orgs
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.orgs ADD COLUMN IF NOT EXISTS clerk_org_id TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS orgs_clerk_org_id_uidx
  ON public.orgs (clerk_org_id)
  WHERE clerk_org_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 0b. Add shop-level columns to otto.shops
--     (mirrors what Prisma stored on Organization)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS reminder_enabled      BOOLEAN DEFAULT FALSE;
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS reminder_quiet_start  INT     DEFAULT 21;
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS reminder_quiet_end    INT     DEFAULT 9;
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS ai_personalization    BOOLEAN DEFAULT FALSE;
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS ai_tone               TEXT    DEFAULT 'friendly';
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS subscription_status   TEXT    DEFAULT 'trial';
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS subscription_tier     TEXT    DEFAULT 'starter';
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS stripe_customer_id    TEXT;
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE otto.shops ADD COLUMN IF NOT EXISTS phone                 TEXT;

-- Ensure upsert(onConflict: 'org_id') works; skip if legacy duplicates exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'otto'
      AND tablename = 'shops'
      AND indexname = 'shops_org_id_uidx'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM otto.shops
      GROUP BY org_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipped creating otto.shops(org_id) unique index because duplicate org_id rows exist.';
    ELSE
      CREATE UNIQUE INDEX shops_org_id_uidx ON otto.shops(org_id);
    END IF;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 0c. Rename repair_orders columns to match new snake_case schema
--     (run only if columns exist with old camelCase names)
-- ─────────────────────────────────────────────────────────────
-- If your repair_orders table has camelCase columns from the old
-- Supabase setup, uncomment and run the renames below:
--
-- ALTER TABLE otto.repair_orders RENAME COLUMN "vehicleId"    TO vehicle_id;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "serviceDate"  TO service_date;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "serviceType"  TO service_type;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "nextDueDate"  TO next_due_date;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "nextDueMileage" TO next_due_mileage;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "mileageAtService" TO mileage_at_service;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "createdAt"    TO created_at;
-- ALTER TABLE otto.repair_orders RENAME COLUMN "updatedAt"    TO updated_at;
--
-- Similarly for otto.customers, otto.vehicles, etc. if needed.

-- ─────────────────────────────────────────────────────────────
-- 0d. Legacy compatibility: otto.customers (setup.sql -> app schema)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS first_name             TEXT;
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS last_name              TEXT;
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS status                 TEXT    DEFAULT 'up_to_date';
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS sms_consent            BOOLEAN DEFAULT FALSE;
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS sms_consent_date       TIMESTAMPTZ;
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS preferred_contact_time TEXT;
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS tags                   TEXT[]  DEFAULT '{}';
ALTER TABLE otto.customers ADD COLUMN IF NOT EXISTS updated_at             TIMESTAMPTZ DEFAULT NOW();

-- If older schema only had "name", split into first_name / last_name.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'otto' AND table_name = 'customers' AND column_name = 'name'
  ) THEN
    UPDATE otto.customers
    SET
      first_name = COALESCE(first_name, split_part(COALESCE(name, ''), ' ', 1)),
      last_name = COALESCE(
        last_name,
        CASE
          WHEN POSITION(' ' IN COALESCE(name, '')) > 0
            THEN ltrim(substring(COALESCE(name, '') FROM POSITION(' ' IN COALESCE(name, '')) + 1))
          ELSE ''
        END
      )
    WHERE first_name IS NULL OR last_name IS NULL;
  END IF;
END $$;

UPDATE otto.customers SET first_name = 'Customer' WHERE COALESCE(first_name, '') = '';
UPDATE otto.customers SET last_name = '' WHERE last_name IS NULL;
UPDATE otto.customers SET status = 'up_to_date' WHERE status IS NULL;
UPDATE otto.customers SET tags = '{}' WHERE tags IS NULL;
UPDATE otto.customers SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'otto' AND table_name = 'customers' AND column_name = 'shop_id'
  ) THEN
    ALTER TABLE otto.customers ALTER COLUMN shop_id DROP NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 0e. Legacy compatibility: otto.vehicles
-- ─────────────────────────────────────────────────────────────
ALTER TABLE otto.vehicles ADD COLUMN IF NOT EXISTS license_plate           TEXT;
ALTER TABLE otto.vehicles ADD COLUMN IF NOT EXISTS mileage_at_last_service INT;
ALTER TABLE otto.vehicles ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMPTZ DEFAULT NOW();

-- Preserve legacy data if old schema used "license".
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'otto' AND table_name = 'vehicles' AND column_name = 'license'
  ) THEN
    UPDATE otto.vehicles
    SET license_plate = COALESCE(license_plate, license)
    WHERE license_plate IS NULL AND license IS NOT NULL;
  END IF;
END $$;

UPDATE otto.vehicles SET updated_at = COALESCE(updated_at, created_at, NOW()) WHERE updated_at IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'otto' AND table_name = 'vehicles' AND column_name = 'shop_id'
  ) THEN
    ALTER TABLE otto.vehicles ALTER COLUMN shop_id DROP NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 0f. Legacy compatibility: otto.repair_orders
-- ─────────────────────────────────────────────────────────────
ALTER TABLE otto.repair_orders ADD COLUMN IF NOT EXISTS service_date       TIMESTAMPTZ;
ALTER TABLE otto.repair_orders ADD COLUMN IF NOT EXISTS service_type       TEXT;
ALTER TABLE otto.repair_orders ADD COLUMN IF NOT EXISTS mileage_at_service INT;
ALTER TABLE otto.repair_orders ADD COLUMN IF NOT EXISTS next_due_date      TIMESTAMPTZ;
ALTER TABLE otto.repair_orders ADD COLUMN IF NOT EXISTS next_due_mileage   INT;
ALTER TABLE otto.repair_orders ADD COLUMN IF NOT EXISTS notes              TEXT;

-- Default/fallback values for legacy rows.
UPDATE otto.repair_orders SET service_date = COALESCE(service_date, created_at, NOW()) WHERE service_date IS NULL;
UPDATE otto.repair_orders SET service_type = COALESCE(service_type, 'oil_change') WHERE service_type IS NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'otto' AND table_name = 'repair_orders' AND column_name = 'description'
  ) THEN
    UPDATE otto.repair_orders
    SET notes = COALESCE(notes, description)
    WHERE notes IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'otto' AND table_name = 'repair_orders' AND column_name = 'shop_id'
  ) THEN
    ALTER TABLE otto.repair_orders ALTER COLUMN shop_id DROP NOT NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 1. otto.follow_up_records
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.follow_up_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id      UUID NOT NULL REFERENCES otto.customers(id) ON DELETE CASCADE,
  repair_order_id  UUID REFERENCES otto.repair_orders(id) ON DELETE SET NULL,
  contact_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method           TEXT NOT NULL,       -- call | text | email
  outcome          TEXT NOT NULL,       -- scheduled | no_response | left_voicemail | wrong_number | other
  notes            TEXT,
  staff_member     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.follow_up_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.follow_up_records;
CREATE POLICY "org_access" ON otto.follow_up_records
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.follow_up_records TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. otto.appointments
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.appointments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id        UUID NOT NULL REFERENCES otto.customers(id) ON DELETE CASCADE,
  vehicle_id         UUID REFERENCES otto.vehicles(id) ON DELETE SET NULL,
  location_id        UUID,  -- FK added after otto.locations created
  scheduled_at       TIMESTAMPTZ NOT NULL,
  duration           INT NOT NULL DEFAULT 60,
  status             TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled | confirmed | completed | cancelled | no_show
  service_type_names TEXT[] DEFAULT '{}',
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.appointments;
CREATE POLICY "org_access" ON otto.appointments
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.appointments TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 3. otto.locations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT,
  phone      TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.locations;
CREATE POLICY "org_access" ON otto.locations
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.locations TO anon, authenticated, service_role;

-- Add FK from appointments to locations now that locations exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_location_id_fkey'
      AND conrelid = 'otto.appointments'::regclass
  ) THEN
    ALTER TABLE otto.appointments
      ADD CONSTRAINT appointments_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES otto.locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 4. otto.service_types
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.service_types (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  display_name              TEXT NOT NULL,
  category                  TEXT NOT NULL DEFAULT 'general',
  description               TEXT,
  sort_order                INT NOT NULL DEFAULT 0,
  default_mileage_interval  INT,
  default_time_interval_days INT,
  reminder_lead_days        INT NOT NULL DEFAULT 14,
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  is_custom                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, name)
);

ALTER TABLE otto.service_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.service_types;
CREATE POLICY "org_access" ON otto.service_types
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.service_types TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 5. otto.reminder_templates
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.reminder_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.reminder_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.reminder_templates;
CREATE POLICY "org_access" ON otto.reminder_templates
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.reminder_templates TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 6. otto.reminder_rules
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.reminder_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  service_type_id  UUID REFERENCES otto.service_types(id) ON DELETE CASCADE,
  sequence_number  INT NOT NULL DEFAULT 1,
  offset_days      INT NOT NULL DEFAULT -14,
  template_id      UUID REFERENCES otto.reminder_templates(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_type    TEXT NOT NULL DEFAULT 'service_due',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.reminder_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.reminder_rules;
CREATE POLICY "org_access" ON otto.reminder_rules
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.reminder_rules TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 7. otto.reminder_messages
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.reminder_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES otto.customers(id) ON DELETE SET NULL,
  vehicle_id      UUID REFERENCES otto.vehicles(id) ON DELETE SET NULL,
  repair_order_id UUID REFERENCES otto.repair_orders(id) ON DELETE SET NULL,
  rule_id         UUID REFERENCES otto.reminder_rules(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES otto.reminder_templates(id) ON DELETE SET NULL,
  scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'queued',   -- queued | sent | delivered | failed | undelivered
  direction       TEXT NOT NULL DEFAULT 'outbound', -- outbound | inbound
  body            TEXT NOT NULL,
  twilio_sid      TEXT,
  ai_generated    BOOLEAN NOT NULL DEFAULT FALSE,
  from_phone      TEXT,
  to_phone        TEXT,
  status_updated_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.reminder_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.reminder_messages;
CREATE POLICY "org_access" ON otto.reminder_messages
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.reminder_messages TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 8. otto.consent_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.consent_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES otto.customers(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,      -- opt_in | opt_out
  source       TEXT NOT NULL,      -- manual | sms_reply | csv_import | api
  performed_by TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.consent_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.consent_logs;
CREATE POLICY "org_access" ON otto.consent_logs
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.consent_logs TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 9. otto.twilio_configs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.twilio_configs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  account_sid  TEXT NOT NULL,
  auth_token   TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.twilio_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.twilio_configs;
CREATE POLICY "org_access" ON otto.twilio_configs
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.twilio_configs TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 10. otto.ai_configs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.ai_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     UUID NOT NULL UNIQUE REFERENCES public.orgs(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL DEFAULT 'anthropic',
  model      TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  api_key    TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.ai_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.ai_configs;
CREATE POLICY "org_access" ON otto.ai_configs
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.ai_configs TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 11. otto.customer_notes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otto.customer_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES otto.customers(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otto.customer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_access" ON otto.customer_notes;
CREATE POLICY "org_access" ON otto.customer_notes
  USING (public.is_org_member(org_id));

GRANT ALL ON otto.customer_notes TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- Verify all tables exist
-- ─────────────────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'otto'
ORDER BY table_name;
