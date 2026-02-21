import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

interface MessageRow {
  id: string
  vehicle_id: string | null
}

interface VehicleRow {
  id: string
  year: number
  make: string
  model: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { orgId: clerkOrgId } = await auth()
    if (!clerkOrgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orgId = await resolveOrgId(clerkOrgId)
    const db = await createProductAdminClient()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 25))

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify customer for messages')

    if (!customerRes.data) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

    const from = (page - 1) * limit
    const to = from + limit - 1
    const messagesRes = await db
      .from('reminder_messages')
      .select('*', { count: 'exact' })
      .eq('customer_id', id)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .range(from, to)
    assertSupabaseError(messagesRes.error, 'Failed to fetch customer messages')

    const messages = (messagesRes.data ?? []) as MessageRow[]
    const vehicleIds = Array.from(new Set(messages.map(m => m.vehicle_id).filter((v): v is string => Boolean(v))))

    let vehicleById = new Map<string, VehicleRow>()
    if (vehicleIds.length > 0) {
      const vehiclesRes = await db
        .from('vehicles')
        .select('id, year, make, model')
        .in('id', vehicleIds)
      assertSupabaseError(vehiclesRes.error, 'Failed to fetch message vehicles')
      vehicleById = new Map(((vehiclesRes.data ?? []) as VehicleRow[]).map(v => [v.id, v]))
    }

    const hydratedMessages = messages.map(message => ({
      ...message,
      vehicle: message.vehicle_id ? vehicleById.get(message.vehicle_id) ?? null : null,
    }))

    const total = messagesRes.count ?? 0
    return NextResponse.json({ data: hydratedMessages, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('[customers/messages] GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
