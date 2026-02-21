# Schema Drift Recovery Playbook (OttoManagerPro)

Date: 2026-02-21

This document captures what was fixed in OttoManagerPro so the same process can be repeated in CleanBuddyPro.

## What was broken

Primary runtime failures:

1. `public.orgs.clerk_org_id` missing
2. `otto.shops.subscription_status` / `subscription_tier` missing
3. `otto.customers.status` missing
4. PostgREST schema cache and legacy table shapes caused cascading `column ... does not exist` errors

## Root cause

A legacy baseline schema (`setup.sql`) existed, but current app code expects newer columns/tables and idempotent migrations from `phase0-migration.sql`.

## What was added/changed

1. `supabase/baseline-setup.sql`
- Repo copy of baseline bootstrap SQL (for new empty environments only).

2. `supabase/phase0-migration.sql`
- Fixed unsupported `CREATE POLICY IF NOT EXISTS` syntax.
- Added idempotent policy creation (`DROP POLICY IF EXISTS` + `CREATE POLICY`).
- Added compatibility patches for legacy schemas:
  - `otto.customers`: `first_name`, `last_name`, `status`, consent/tags/updated fields
  - `otto.vehicles`: `license_plate`, `mileage_at_last_service`, `updated_at`
  - `otto.repair_orders`: `service_date`, `service_type`, `mileage_at_service`, `next_due_*`, `notes`
- Added safe index creation for:
  - `public.orgs(clerk_org_id)` (nullable unique)
  - `otto.shops(org_id)` (with duplicate guard notice)

3. Runtime schema check endpoint
- Added `GET /api/health/schema` at:
  - `app/api/health/schema/route.ts`
- Returns:
  - `200` when required schema is aligned
  - `500` with per-check remediation hints when not aligned

4. App insert hardening (legacy-safe)
- Ensured `org_id` is always set on `vehicles` / `repair_orders` inserts:
  - `app/api/customers/route.ts`
  - `app/api/vehicles/route.ts`
  - `app/api/service-records/route.ts`
  - `lib/import/process-rows.ts`

5. Documentation
- Added migration runbook: `supabase/MIGRATIONS.md`
- Added README pointer for Supabase migration order.

## Correct run order (Otto)

1. New empty project:
1. Run `supabase/baseline-setup.sql`
2. Run `supabase/phase0-migration.sql`

2. Existing legacy project:
1. Run `supabase/phase0-migration.sql` only

3. Backfill shop rows if needed:

```sql
insert into otto.shops (org_id, name, subscription_status, subscription_tier)
select o.id, coalesce(nullif(o.name, ''), o.slug, 'Shop'), 'trial', 'starter'
from public.orgs o
left join otto.shops s on s.org_id = o.id
where s.org_id is null;
```

4. Verify:
- `GET /api/health/schema` should return `"ok": true`

## CleanBuddyPro replay checklist

When you do this in CleanBuddyPro, follow the same structure:

1. Confirm product schema name (likely `cleanbuddy`) in server/admin clients.
2. Build/patch a `phase` migration that:
  - Adds missing `public.orgs` bridge fields used by code.
  - Adds missing `cleanbuddy.*` columns/tables expected by app routes.
  - Uses idempotent SQL only.
3. Add a schema health endpoint:
  - `GET /api/health/schema`
  - Include all critical `public` + `cleanbuddy` checks used by runtime routes.
4. Ensure inserts include required `org_id` where legacy schema enforces NOT NULL.
5. Run migrations, then verify health endpoint returns all checks passing.

## Non-goals

- This playbook does not replace full migration versioning (Supabase migrations table).
- It is a practical recovery/normalization reference for drifted environments.
