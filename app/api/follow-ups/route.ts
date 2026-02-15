import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createFollowUpSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Prisma.FollowUpRecordWhereInput = { orgId }

    if (customerId) {
      where.customerId = customerId
    }

    const records = await prisma.followUpRecord.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        serviceRecord: {
          include: {
            vehicle: {
              select: {
                year: true,
                make: true,
                model: true
              }
            }
          }
        }
      },
      orderBy: { contactDate: 'desc' },
      take: limit
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Error fetching follow-up records:', error)
    return NextResponse.json({ error: 'Failed to fetch follow-up records' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = createFollowUpSchema.parse(body)
    const { customerId, serviceRecordId, method, outcome, notes, staffMember } = data

    // Verify customer belongs to this org
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Verify service record exists and belongs to this customer
    const serviceRecord = await prisma.serviceRecord.findFirst({
      where: {
        id: serviceRecordId,
        vehicle: {
          customerId
        }
      }
    })

    if (!serviceRecord) {
      return NextResponse.json({ error: 'Service record not found' }, { status: 404 })
    }

    // Create follow-up record
    const record = await prisma.followUpRecord.create({
      data: {
        customerId,
        serviceRecordId,
        orgId,
        method,
        outcome,
        notes,
        staffMember
      }
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Error creating follow-up record:', error)
    return NextResponse.json({ error: 'Failed to create follow-up record' }, { status: 500 })
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
      return NextResponse.json({ error: 'Follow-up record ID required' }, { status: 400 })
    }

    // Verify record belongs to this org
    const record = await prisma.followUpRecord.findFirst({
      where: { id, orgId }
    })

    if (!record) {
      return NextResponse.json({ error: 'Follow-up record not found' }, { status: 404 })
    }

    await prisma.followUpRecord.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting follow-up record:', error)
    return NextResponse.json({ error: 'Failed to delete follow-up record' }, { status: 500 })
  }
}
