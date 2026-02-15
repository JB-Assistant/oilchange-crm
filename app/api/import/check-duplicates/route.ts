import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phones } = await request.json() as { phones: string[] }

    if (!Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ existingPhones: [] })
    }

    // Limit to prevent abuse
    const limitedPhones = phones.slice(0, 1000).filter(p => typeof p === 'string' && p.length >= 10)

    const existing = await prisma.customer.findMany({
      where: { orgId, phone: { in: limitedPhones } },
      select: { phone: true },
    })

    return NextResponse.json({
      existingPhones: existing.map(c => c.phone),
    })
  } catch (error) {
    console.error('Error checking duplicates:', error)
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 })
  }
}
