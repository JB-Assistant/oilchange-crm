import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CustomerStatus, Prisma } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage, getStatusFromDueDate } from '@/lib/customer-status'
import { createServiceRecordSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    const where: Prisma.ServiceRecordWhereInput = {
      vehicle: {
        customer: { orgId }
      }
    }

    if (vehicleId) {
      where.vehicleId = vehicleId
    }

    const records = await prisma.serviceRecord.findMany({
      where,
      include: {
        vehicle: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { serviceDate: 'desc' }
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching service records:', error)
    return NextResponse.json({ error: 'Failed to fetch service records' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createServiceRecordSchema.parse(body)
    const { vehicleId, serviceDate, mileageAtService, serviceType, notes } = data

    // Verify vehicle belongs to this org
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        customer: { orgId }
      },
      include: {
        customer: true
      }
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Look up service type intervals (fall back to defaults if not found)
    const serviceDateObj = new Date(serviceDate)
    const serviceTypeDef = await prisma.serviceType.findFirst({
      where: { orgId, name: serviceType || 'oil_change_standard' },
    })
    const nextDueDate = calculateNextDueDate(serviceDateObj, serviceTypeDef?.defaultTimeIntervalDays)
    const nextDueMileage = calculateNextDueMileage(mileageAtService, serviceTypeDef?.defaultMileageInterval)

    // Create service record
    const record = await prisma.serviceRecord.create({
      data: {
        vehicleId,
        serviceDate: serviceDateObj,
        mileageAtService,
        serviceType: serviceType || 'oil_change',
        notes,
        nextDueDate,
        nextDueMileage
      }
    })

    // Update vehicle's last service mileage
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { mileageAtLastService: mileageAtService }
    })

    // Update customer status based on all their vehicles
    await updateCustomerStatus(vehicle.customerId, orgId)

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating service record:', error)
    return NextResponse.json({ error: 'Failed to create service record' }, { status: 500 })
  }
}

async function updateCustomerStatus(customerId: string, orgId: string) {
  // Get all vehicles for this customer with their latest service records
  const vehicles = await prisma.vehicle.findMany({
    where: { customerId },
    include: {
      serviceRecords: {
        orderBy: { serviceDate: 'desc' },
        take: 1
      }
    }
  })

  // Determine the most urgent status across all vehicles
  let mostUrgentStatus: CustomerStatus = CustomerStatus.up_to_date
  
  for (const vehicle of vehicles) {
    const latestService = vehicle.serviceRecords[0]
    if (latestService) {
      const status = getStatusFromDueDate(
        latestService.nextDueDate,
        latestService.nextDueMileage,
        vehicle.mileageAtLastService || 0
      )
      
      // Priority: overdue > due_now > due_soon > up_to_date
      if (status === CustomerStatus.overdue) {
        mostUrgentStatus = CustomerStatus.overdue
        break
      } else if (status === CustomerStatus.due_now) {
        mostUrgentStatus = CustomerStatus.due_now
      } else if (status === CustomerStatus.due_soon && mostUrgentStatus === CustomerStatus.up_to_date) {
        mostUrgentStatus = CustomerStatus.due_soon
      }
    }
  }

  // Update customer status
  await prisma.customer.update({
    where: { id: customerId },
    data: { status: mostUrgentStatus }
  })
}

export async function DELETE(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Service record ID required' }, { status: 400 })
    }

    // Verify record belongs to this org
    const record = await prisma.serviceRecord.findFirst({
      where: {
        id,
        vehicle: {
          customer: { orgId }
        }
      }
    })

    if (!record) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    await prisma.serviceRecord.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting service record:', error)
    return NextResponse.json({ error: 'Failed to delete service record' }, { status: 500 })
  }
}
