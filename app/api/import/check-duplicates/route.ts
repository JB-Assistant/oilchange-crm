import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { phones } = await request.json() as { phones: string[] }
    if (!Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ existingPhones: [] })
    }

    const limitedPhones = phones.slice(0, 1000).filter(p => typeof p === 'string' && p.length >= 10)
    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()

    const { data: existing } = await db
      .from('customers')
      .select('phone')
      .eq('org_id', orgId)
      .in('phone', limitedPhones)

    return NextResponse.json({ existingPhones: (existing ?? []).map(c => c.phone) })
  } catch (error) {
    console.error('[import/check-duplicates]:', error)
    return NextResponse.json({ error: 'Failed to check duplicates' }, { status: 500 })
  }
}
