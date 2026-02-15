import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { tag } = await req.json()

    if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({
      where: { id, orgId },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const normalizedTag = tag.trim().toLowerCase()
    if (customer.tags.includes(normalizedTag)) {
      return NextResponse.json({ error: 'Tag already exists' }, { status: 400 })
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { tags: { push: normalizedTag } },
    })

    return NextResponse.json({ tags: updated.tags })
  } catch (error) {
    console.error('Error adding tag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const tag = searchParams.get('tag')

    if (!tag) {
      return NextResponse.json({ error: 'Tag is required' }, { status: 400 })
    }

    const customer = await prisma.customer.findFirst({
      where: { id, orgId },
    })
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { tags: { set: customer.tags.filter(t => t !== tag) } },
    })

    return NextResponse.json({ tags: updated.tags })
  } catch (error) {
    console.error('Error removing tag:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
