import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customers = await prisma.customer.findMany({
      where: { orgId },
      include: {
        vehicles: {
          include: {
            serviceRecords: { orderBy: { serviceDate: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { lastName: 'asc' },
    })

    const header = 'firstName,lastName,phone,email,status,vehicleCount,smsConsent,tags,createdAt\n'
    const rows = customers.map(c => [
      escapeCsv(c.firstName),
      escapeCsv(c.lastName),
      escapeCsv(c.phone),
      escapeCsv(c.email || ''),
      c.status,
      c.vehicles.length,
      c.smsConsent,
      escapeCsv(c.tags.join('; ')),
      c.createdAt.toISOString().split('T')[0],
    ].join(',')).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting customers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
