import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const services = await prisma.serviceRecord.findMany({
      where: { vehicle: { customer: { orgId } } },
      include: {
        vehicle: { include: { customer: true } },
      },
      orderBy: { serviceDate: 'desc' },
    })

    const header = 'customerName,phone,vehicle,serviceType,serviceDate,mileage,nextDueDate,nextDueMileage,notes\n'
    const rows = services.map(s => [
      escapeCsv(`${s.vehicle.customer.firstName} ${s.vehicle.customer.lastName}`),
      escapeCsv(s.vehicle.customer.phone),
      escapeCsv(`${s.vehicle.year} ${s.vehicle.make} ${s.vehicle.model}`),
      escapeCsv(s.serviceType),
      s.serviceDate.toISOString().split('T')[0],
      s.mileageAtService,
      s.nextDueDate.toISOString().split('T')[0],
      s.nextDueMileage,
      escapeCsv(s.notes || ''),
    ].join(',')).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="services-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting services:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
