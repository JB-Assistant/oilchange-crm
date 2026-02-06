import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CustomerStatus } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage, getStatusFromDueDate } from '@/lib/customer-status'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    const where: any = {
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
    const { vehicleId, serviceDate, mileageAtService, serviceType, notes } = body

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

    // Calculate next due date and mileage
    const serviceDateObj = new Date(serviceDate)
    const nextDueDate = calculateNextDueDate(serviceDateObj)
    const nextDueMileage = calculateNextDueMileage(mileageAtService)

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
  let mostUrgentStatus = CustomerStatus.up_to_date
  
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
      } else if (status === CustomerStatus.due_now && mostUrgentStatus !== CustomerStatus.overdue) {
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
