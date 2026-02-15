import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AppointmentStatus, Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as AppointmentStatus | null
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const customerId = searchParams.get('customerId')

    const where: Prisma.AppointmentWhereInput = { orgId }

    if (status) {
      where.status = status
    }
    if (customerId) {
      where.customerId = customerId
    }
    if (from || to) {
      where.scheduledAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        customer: { select: { firstName: true, lastName: true, phone: true } },
        vehicle: { select: { year: true, make: true, model: true } },
      },
    })

    return NextResponse.json({ data: appointments })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

interface CreateAppointmentBody {
  customerId: string
  vehicleId?: string
  scheduledAt: string
  duration?: number
  serviceTypeNames?: string[]
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: CreateAppointmentBody = await request.json()
    const { customerId, vehicleId, scheduledAt, duration, serviceTypeNames, notes } = body

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const appointment = await prisma.appointment.create({
      data: {
        orgId,
        customerId,
        vehicleId: vehicleId ?? null,
        scheduledAt: new Date(scheduledAt),
        duration: duration ?? 60,
        serviceTypeNames: serviceTypeNames ?? [],
        notes: notes ?? null,
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
