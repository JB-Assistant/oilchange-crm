/**
 * Backfill script: adds new service types to all existing organizations.
 *
 * Usage:  npx dotenv -- tsx scripts/backfill-service-types.ts
 *    or:  npx tsx scripts/backfill-service-types.ts  (if .env is auto-loaded)
 */
import { config } from 'dotenv'
config({ override: true })
import { PrismaClient } from '@prisma/client'
import { seedOrgDefaults } from '../lib/seed-defaults'

const prisma = new PrismaClient()

async function main() {
  const orgs = await prisma.organization.findMany({
    select: { clerkOrgId: true, name: true },
  })

  console.log(`Found ${orgs.length} organization(s) to backfill.\n`)

  for (const org of orgs) {
    const before = await prisma.serviceType.count({
      where: { orgId: org.clerkOrgId },
    })

    await seedOrgDefaults(org.clerkOrgId)

    const after = await prisma.serviceType.count({
      where: { orgId: org.clerkOrgId },
    })

    const added = after - before
    console.log(
      `${org.name} (${org.clerkOrgId}): ${before} → ${after} service types` +
        (added > 0 ? ` (+${added} new)` : ' (no changes)')
    )
  }

  console.log('\nBackfill complete!')
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
