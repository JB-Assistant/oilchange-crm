import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    const where: any = {
      customer: { orgId }
    }
    
    if (customerId) {
      where.customerId = customerId
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        serviceRecords: {
          orderBy: { serviceDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { customerId, year, make, model, licensePlate } = body

    // Verify customer belongs to this org
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        customerId,
        year,
        make,
        model,
        licensePlate: licensePlate || null
      }
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('Error creating vehicle:', error)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
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
      return NextResponse.json({ error: 'Vehicle ID required' }, { status: 400 })
    }

    // Verify vehicle belongs to this org
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        customer: { orgId }
      }
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    await prisma.vehicle.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vehicle:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
