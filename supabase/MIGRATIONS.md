# Supabase Migration Runbook (OttoManagerPro)

This project now uses a two-step SQL migration flow:

1. `supabase/baseline-setup.sql` (base platform + product schemas)
2. `supabase/phase0-migration.sql` (compatibility + app-required columns/tables)

## Which script should I run?

- New/empty Supabase project:
1. Run `supabase/baseline-setup.sql`
2. Run `supabase/phase0-migration.sql`

- Existing legacy project (already has `public.orgs`, `otto.shops`, etc.):
1. Run `supabase/phase0-migration.sql` only

## Why both files exist

- `baseline-setup.sql` reflects the older bootstrap schema.
- `phase0-migration.sql` upgrades legacy shapes to current app expectations (for example: `public.orgs.clerk_org_id`, `otto.customers.status`, `otto.shops.subscription_status`, and new reminder/settings tables).

## Post-run verification SQL

Run these in Supabase SQL Editor:

```sql
-- 1) Bridge + critical columns
select table_schema, table_name, column_name
from information_schema.columns
where
  (table_schema = 'public' and table_name = 'orgs' and column_name = 'clerk_org_id')
  or
  (table_schema = 'otto' and table_name = 'shops' and column_name in ('subscription_status', 'subscription_tier'))
  or
  (table_schema = 'otto' and table_name = 'customers' and column_name in ('first_name', 'last_name', 'status'))
order by table_schema, table_name, column_name;

-- 2) One shop row per org (safe backfill)
insert into otto.shops (org_id, name, subscription_status, subscription_tier)
select o.id, coalesce(nullif(o.name, ''), o.slug, 'Shop'), 'trial', 'starter'
from public.orgs o
left join otto.shops s on s.org_id = o.id
where s.org_id is null;

-- 3) Basic row counts
select 'public.orgs' as table_name, count(*)::bigint as rows from public.orgs
union all
select 'otto.shops', count(*)::bigint from otto.shops
union all
select 'otto.customers', count(*)::bigint from otto.customers
union all
select 'otto.repair_orders', count(*)::bigint from otto.repair_orders;
```

## Runtime schema health endpoint

After migrating, hit:

- `GET /api/health/schema`

This endpoint validates required `public` + `otto` columns/tables and returns:

- `200` when all checks pass
- `500` with per-check remediations if anything is missing

