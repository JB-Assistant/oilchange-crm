-- ============================================================
-- UNIFIED AI VERTICAL PLATFORM — DATABASE SETUP
-- Supabase Project: CustomerTesting
--
-- Architecture:
--   public schema    → Platform Layer (orgs, members, user_apps)
--   cleanbuddy       → CleanBuddyPro
--   otto             → OttoManagerPro
--   tire_v2          → TireManagerPro V2
--   fieldagent_ai    → FieldAgent AI
--   otto_v2          → OttoManagerPro V2
--
-- RLS Strategy: org_id on every table → org_members join check
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- STEP 1: Create product schemas
-- ─────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS cleanbuddy;
CREATE SCHEMA IF NOT EXISTS otto;
CREATE SCHEMA IF NOT EXISTS tire_v2;
CREATE SCHEMA IF NOT EXISTS fieldagent_ai;
CREATE SCHEMA IF NOT EXISTS otto_v2;


-- ─────────────────────────────────────────────────────────────
-- STEP 2: Grant permissions to all schemas
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  s TEXT;
BEGIN
  FOREACH s IN ARRAY ARRAY['public','cleanbuddy','otto','tire_v2','fieldagent_ai','otto_v2']
  LOOP
    EXECUTE format('GRANT USAGE ON SCHEMA %I TO anon, authenticated, service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO anon, authenticated, service_role', s);
    EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO anon, authenticated, service_role', s);
  END LOOP;
END $$;


-- ============================================================
-- PLATFORM LAYER — public schema
-- Shared across all products
-- ============================================================

-- ─────────────────────────────────────────
-- public.orgs
-- Represents a business account (a tire shop, cleaning company, etc.)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orgs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slug         TEXT UNIQUE,                        -- url-friendly name
  industry     TEXT,                               -- auto | cleaning | tire | field_service
  plan         TEXT DEFAULT 'trial',               -- trial | basic | pro
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- public.org_members
-- Defines roles across apps — one user can be in multiple orgs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'tech',       -- owner | manager | tech
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- ─────────────────────────────────────────
-- public.user_apps
-- Maps which product(s) a user has access to
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_apps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app          TEXT NOT NULL,                      -- cleanbuddy | otto | tire_v2 | fieldagent_ai | otto_v2
  org_id       UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, app)
);

-- ─────────────────────────────────────────
-- RLS — Platform Layer
-- ─────────────────────────────────────────
ALTER TABLE public.orgs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_apps   ENABLE ROW LEVEL SECURITY;

-- orgs: visible to members only
CREATE POLICY "org_members_can_view" ON public.orgs
  FOR SELECT USING (
    id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- org_members: members can view their own org's members
CREATE POLICY "org_members_can_view" ON public.org_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- org_members: only owners can manage membership
CREATE POLICY "owners_can_manage" ON public.org_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- user_apps: users see only their own records
CREATE POLICY "own_records_only" ON public.user_apps
  FOR ALL USING (user_id = auth.uid());


-- ─────────────────────────────────────────
-- Helper function: check if user is org member
-- Used in all product schema RLS policies
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user has a specific role in org
CREATE OR REPLACE FUNCTION public.has_org_role(p_org_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role = p_role
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- STANDARD RLS POLICY TEMPLATE (reference — not executed)
-- Apply this pattern to every product schema table
--
-- create policy org_access
-- on some_schema.some_table
-- for all
-- using (
--   exists (
--     select 1 from public.org_members m
--     where m.org_id = some_table.org_id
--       and m.user_id = auth.uid()
--   )
-- )
-- with check (
--   exists (
--     select 1 from public.org_members m
--     where m.org_id = some_table.org_id
--       and m.user_id = auth.uid()
--   )
-- );
-- ============================================================


-- ============================================================
-- CLEANBUDDY SCHEMA — CleanBuddyPro
-- Specialty cleaning businesses
-- ============================================================

CREATE TABLE IF NOT EXISTS cleanbuddy.businesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT,                               -- carpet | window | pressure_wash | janitorial
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleanbuddy.customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  business_id  UUID NOT NULL REFERENCES cleanbuddy.businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cleanbuddy.jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  business_id  UUID NOT NULL REFERENCES cleanbuddy.businesses(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES cleanbuddy.customers(id),
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT DEFAULT 'pending',            -- pending | scheduled | in_progress | completed | cancelled
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  price        NUMERIC(10,2),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE cleanbuddy.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanbuddy.customers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanbuddy.jobs       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON cleanbuddy.businesses
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON cleanbuddy.customers
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON cleanbuddy.jobs
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));


-- ============================================================
-- OTTO SCHEMA — OttoManagerPro
-- Auto repair shop management
-- ============================================================

CREATE TABLE IF NOT EXISTS otto.shops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otto.customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES otto.shops(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otto.vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES otto.shops(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES otto.customers(id),
  year         INT,
  make         TEXT,
  model        TEXT,
  vin          TEXT,
  license      TEXT,
  mileage      INT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otto.repair_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES otto.shops(id) ON DELETE CASCADE,
  vehicle_id   UUID REFERENCES otto.vehicles(id),
  customer_id  UUID REFERENCES otto.customers(id),
  status       TEXT DEFAULT 'open',               -- open | in_progress | waiting_parts | completed | invoiced
  description  TEXT,
  labor_cost   NUMERIC(10,2) DEFAULT 0,
  parts_cost   NUMERIC(10,2) DEFAULT 0,
  total_cost   NUMERIC(10,2) GENERATED ALWAYS AS (labor_cost + parts_cost) STORED,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE otto.shops         ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto.customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto.vehicles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto.repair_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON otto.shops
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON otto.customers
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON otto.vehicles
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON otto.repair_orders
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));


-- ============================================================
-- TIRE_V2 SCHEMA — TireManagerPro V2
-- Tire shop management — supports multi-location orgs
-- ============================================================

CREATE TABLE IF NOT EXISTS tire_v2.shops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  address      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tire_v2.inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES tire_v2.shops(id) ON DELETE CASCADE,
  brand        TEXT NOT NULL,
  model        TEXT,
  size         TEXT NOT NULL,                     -- e.g. 225/65R17
  type         TEXT,                              -- summer | winter | all-season | performance
  quantity     INT DEFAULT 0,
  cost_price   NUMERIC(10,2),
  sell_price   NUMERIC(10,2),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tire_v2.work_orders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id        UUID NOT NULL REFERENCES tire_v2.shops(id) ON DELETE CASCADE,
  customer_name  TEXT NOT NULL,
  customer_phone TEXT,
  vehicle_info   TEXT,
  status         TEXT DEFAULT 'pending',          -- pending | in_progress | completed | invoiced
  total_amount   NUMERIC(10,2),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE tire_v2.shops       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_v2.inventory   ENABLE ROW LEVEL SECURITY;
ALTER TABLE tire_v2.work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON tire_v2.shops
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON tire_v2.inventory
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON tire_v2.work_orders
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));


-- ============================================================
-- FIELDAGENT_AI SCHEMA — FieldAgent AI
-- AI-powered dispatch & field service platform
-- AI agents can query across otto + tire_v2 via org_id
-- ============================================================

CREATE TABLE IF NOT EXISTS fieldagent_ai.companies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  industry     TEXT,                              -- hvac | plumbing | electrical | cleaning | pest_control
  phone        TEXT,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fieldagent_ai.agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES fieldagent_ai.companies(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  status       TEXT DEFAULT 'available',          -- available | busy | offline
  location_lat NUMERIC(10,7),
  location_lng NUMERIC(10,7),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fieldagent_ai.dispatches (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  company_id     UUID NOT NULL REFERENCES fieldagent_ai.companies(id) ON DELETE CASCADE,
  agent_id       UUID REFERENCES fieldagent_ai.agents(id),
  customer_name  TEXT NOT NULL,
  customer_phone TEXT,
  address        TEXT,
  issue          TEXT,
  priority       TEXT DEFAULT 'normal',           -- low | normal | high | urgent
  status         TEXT DEFAULT 'pending',          -- pending | assigned | en_route | on_site | completed
  ai_summary     TEXT,                            -- AI-generated dispatch summary
  scheduled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fieldagent_ai.ai_interactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  company_id   UUID NOT NULL REFERENCES fieldagent_ai.companies(id) ON DELETE CASCADE,
  dispatch_id  UUID REFERENCES fieldagent_ai.dispatches(id),
  type         TEXT,                              -- inbound_call | customer_sms | agent_update
  input_text   TEXT,
  ai_response  TEXT,
  tokens_used  INT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE fieldagent_ai.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldagent_ai.agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldagent_ai.dispatches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldagent_ai.ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON fieldagent_ai.companies
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON fieldagent_ai.agents
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON fieldagent_ai.dispatches
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON fieldagent_ai.ai_interactions
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));


-- ============================================================
-- OTTO_V2 SCHEMA — OttoManagerPro V2
-- Enhanced auto shop management with service history
-- ============================================================

CREATE TABLE IF NOT EXISTS otto_v2.shops (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  subscription TEXT DEFAULT 'trial',              -- trial | basic | pro
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otto_v2.customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES otto_v2.shops(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otto_v2.vehicles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id      UUID NOT NULL REFERENCES otto_v2.shops(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES otto_v2.customers(id),
  year         INT,
  make         TEXT,
  model        TEXT,
  vin          TEXT,
  license      TEXT,
  mileage      INT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otto_v2.service_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              UUID NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  shop_id             UUID NOT NULL REFERENCES otto_v2.shops(id) ON DELETE CASCADE,
  vehicle_id          UUID NOT NULL REFERENCES otto_v2.vehicles(id) ON DELETE CASCADE,
  service_type        TEXT NOT NULL,
  description         TEXT,
  mileage_at_service  INT,
  cost                NUMERIC(10,2),
  performed_at        TIMESTAMPTZ DEFAULT NOW(),
  next_due_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE otto_v2.shops           ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto_v2.customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto_v2.vehicles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE otto_v2.service_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_access" ON otto_v2.shops
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON otto_v2.customers
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON otto_v2.vehicles
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

CREATE POLICY "org_access" ON otto_v2.service_history
  FOR ALL USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));


-- ============================================================
-- VERIFICATION — Run after setup to confirm everything
-- ============================================================
SELECT
  table_schema   AS schema,
  COUNT(*)       AS tables
FROM information_schema.tables
WHERE table_schema IN ('public','cleanbuddy','otto','tire_v2','fieldagent_ai','otto_v2')
  AND table_type = 'BASE TABLE'
GROUP BY table_schema
ORDER BY table_schema;
