import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET() {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: customers } = await db
      .from('customers')
      .select('id, first_name, last_name, phone, email, status, sms_consent, tags, created_at')
      .eq('org_id', orgId)
      .order('last_name', { ascending: true })

    const customerIds = (customers ?? []).map(c => c.id)
    const vehicleCountByCustomer = new Map<string, number>()

    if (customerIds.length > 0) {
      const { data: vehicles } = await db
        .from('vehicles')
        .select('customer_id')
        .in('customer_id', customerIds)

      for (const v of (vehicles ?? [])) {
        vehicleCountByCustomer.set(v.customer_id, (vehicleCountByCustomer.get(v.customer_id) ?? 0) + 1)
      }
    }

    const header = 'firstName,lastName,phone,email,status,vehicleCount,smsConsent,tags,createdAt\n'
    const rows = (customers ?? []).map(c => [
      escapeCsv(c.first_name),
      escapeCsv(c.last_name),
      escapeCsv(c.phone),
      escapeCsv(c.email || ''),
      c.status,
      vehicleCountByCustomer.get(c.id) ?? 0,
      c.sms_consent,
      escapeCsv((c.tags ?? []).join('; ')),
      c.created_at?.split('T')[0] ?? '',
    ].join(',')).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('[export/customers]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
