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
    const status = searchParams.get('status') as CustomerStatus | null
    const search = searchParams.get('search')

    const where: any = { orgId }
    
    if (status) {
      where.status = status
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        vehicles: {
          include: {
            serviceRecords: {
              orderBy: { serviceDate: 'desc' },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, phone, email, vehicles = [] } = body

    // Check for duplicate phone number
    const existing = await prisma.customer.findFirst({
      where: { orgId, phone }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A customer with this phone number already exists' },
        { status: 400 }
      )
    }

    // Create customer with vehicles
    const customer = await prisma.customer.create({
      data: {
        firstName,
        lastName,
        phone,
        email,
        status: CustomerStatus.up_to_date,
        orgId,
        vehicles: {
          create: vehicles.map((v: any) => ({
            year: v.year,
            make: v.make,
            model: v.model,
            licensePlate: v.licensePlate
          }))
        }
      },
      include: {
        vehicles: true
      }
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error('Error creating customer:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...data } = body

    const customer = await prisma.customer.updateMany({
      where: { id, orgId },
      data
    })

    if (customer.count === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
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
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 })
    }

    await prisma.customer.deleteMany({
      where: { id, orgId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
