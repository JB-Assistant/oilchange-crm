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
      .select('id, first_name, last_name, phone')
      .eq('org_id', orgId)

    const customerIds = (customers ?? []).map(c => c.id)
    if (customerIds.length === 0) {
      const header = 'customerName,phone,vehicle,serviceType,serviceDate,mileage,nextDueDate,nextDueMileage,notes\n'
      return new NextResponse(header, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="services-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    const { data: vehicles } = await db
      .from('vehicles')
      .select('id, customer_id, year, make, model')
      .in('customer_id', customerIds)

    const vehicleIds = (vehicles ?? []).map(v => v.id)
    const vehicleById = new Map((vehicles ?? []).map(v => [v.id, v]))
    const customerById = new Map((customers ?? []).map(c => [c.id, c]))

    let repairOrders: Array<{
      vehicle_id: string; service_type: string; service_date: string;
      mileage_at_service: number; next_due_date: string; next_due_mileage: number; notes: string | null
    }> = []

    if (vehicleIds.length > 0) {
      const { data } = await db
        .from('repair_orders')
        .select('vehicle_id, service_type, service_date, mileage_at_service, next_due_date, next_due_mileage, notes')
        .in('vehicle_id', vehicleIds)
        .order('service_date', { ascending: false })
      repairOrders = (data ?? []) as typeof repairOrders
    }

    const header = 'customerName,phone,vehicle,serviceType,serviceDate,mileage,nextDueDate,nextDueMileage,notes\n'
    const rows = repairOrders.flatMap(ro => {
      const vehicle = vehicleById.get(ro.vehicle_id)
      if (!vehicle) return []
      const customer = customerById.get(vehicle.customer_id)
      if (!customer) return []
      return [[
        escapeCsv(`${customer.first_name} ${customer.last_name}`),
        escapeCsv(customer.phone),
        escapeCsv(`${vehicle.year} ${vehicle.make} ${vehicle.model}`),
        escapeCsv(ro.service_type),
        ro.service_date?.split('T')[0] ?? '',
        ro.mileage_at_service,
        ro.next_due_date?.split('T')[0] ?? '',
        ro.next_due_mileage,
        escapeCsv(ro.notes || ''),
      ].join(',')]
    }).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="services-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('[export/services]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
