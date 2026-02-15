import { prisma } from '@/lib/prisma'
import type { DuplicateInfo, CleanedRow } from './types'

export async function checkDuplicatePhones(
  orgId: string,
  rows: CleanedRow[]
): Promise<DuplicateInfo[]> {
  const phones = rows
    .map(r => r.cells.phone?.value)
    .filter((p): p is string => !!p && p.length >= 10)

  if (phones.length === 0) return []

  const existing = await prisma.customer.findMany({
    where: { orgId, phone: { in: phones } },
    select: { phone: true, firstName: true, lastName: true },
  })

  const existingSet = new Map(
    existing.map(c => [c.phone, `${c.firstName} ${c.lastName}`])
  )

  const duplicates: DuplicateInfo[] = []
  for (const row of rows) {
    const phone = row.cells.phone?.value
    if (!phone) continue

    const existingName = existingSet.get(phone)
    if (existingName) {
      const name = `${row.cells.firstName?.value ?? ''} ${row.cells.lastName?.value ?? ''}`.trim()
      duplicates.push({
        phone,
        rowIndex: row.rowIndex,
        name,
        type: 'existing',
      })
    }
  }

  return duplicates
}
