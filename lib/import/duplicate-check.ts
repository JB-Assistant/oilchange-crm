import { createProductAdminClient } from '@/lib/supabase/server'
import type { DuplicateInfo, CleanedRow } from './types'

export async function checkDuplicatePhones(
  orgId: string,
  rows: CleanedRow[]
): Promise<DuplicateInfo[]> {
  const phones = rows
    .map(r => r.cells.phone?.value)
    .filter((p): p is string => !!p && p.length >= 10)

  if (phones.length === 0) return []

  const db = await createProductAdminClient()
  const { data: existing } = await db
    .from('customers')
    .select('phone, first_name, last_name')
    .eq('org_id', orgId)
    .in('phone', phones)

  const existingSet = new Map(
    (existing ?? []).map((c: { phone: string; first_name: string; last_name: string }) => [
      c.phone,
      `${c.first_name} ${c.last_name}`,
    ])
  )

  const duplicates: DuplicateInfo[] = []
  for (const row of rows) {
    const phone = row.cells.phone?.value
    if (!phone) continue

    const existingName = existingSet.get(phone)
    if (existingName) {
      const name = `${row.cells.firstName?.value ?? ''} ${row.cells.lastName?.value ?? ''}`.trim()
      duplicates.push({ phone, rowIndex: row.rowIndex, name, type: 'existing' })
    }
  }

  return duplicates
}
