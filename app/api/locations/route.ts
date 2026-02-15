import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type PatchBody = {
  id: string; name?: string; address?: string; phone?: string
  isDefault?: boolean; isActive?: boolean
}

export async function GET() {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const locations = await prisma.location.findMany({
      where: { orgId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
    return NextResponse.json({ data: locations })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body: { name: string; address?: string; phone?: string; isDefault?: boolean } =
      await req.json()
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (body.isDefault) {
      await prisma.location.updateMany({ where: { orgId }, data: { isDefault: false } })
    }
    const location = await prisma.location.create({
      data: {
        orgId,
        name: body.name.trim(),
        address: body.address?.trim() ?? null,
        phone: body.phone?.trim() ?? null,
        isDefault: body.isDefault ?? false,
      },
    })
    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body: PatchBody = await req.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Location id is required' }, { status: 400 })
    }
    if (body.isDefault) {
      await prisma.location.updateMany({ where: { orgId }, data: { isDefault: false } })
    }
    const location = await prisma.location.update({
      where: { id: body.id, orgId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.address !== undefined && { address: body.address.trim() }),
        ...(body.phone !== undefined && { phone: body.phone.trim() }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    })
    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
