import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { assertSupabaseError, getOttoClient } from '@/lib/supabase/otto'

interface MessageRow {
  id: string
  vehicleId: string | null
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
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getOttoClient()
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 25))

    const customerRes = await db
      .from('customers')
      .select('id')
      .eq('id', id)
      .eq('orgId', orgId)
      .maybeSingle()
    assertSupabaseError(customerRes.error, 'Failed to verify customer for messages')

    if (!customerRes.data) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const messagesRes = await db
      .from('reminder_messages')
      .select('*', { count: 'exact' })
      .eq('customerId', id)
      .eq('orgId', orgId)
      .order('createdAt', { ascending: false })
      .range(from, to)
    assertSupabaseError(messagesRes.error, 'Failed to fetch customer messages')

    const messages = (messagesRes.data ?? []) as MessageRow[]
    const vehicleIds = Array.from(new Set(messages.map((message) => message.vehicleId).filter((value): value is string => Boolean(value))))

    let vehicleById = new Map<string, VehicleRow>()
    if (vehicleIds.length > 0) {
      const vehiclesRes = await db
        .from('vehicles')
        .select('id, year, make, model')
        .in('id', vehicleIds)
      assertSupabaseError(vehiclesRes.error, 'Failed to fetch message vehicles')
      vehicleById = new Map(((vehiclesRes.data ?? []) as VehicleRow[]).map((vehicle) => [vehicle.id, vehicle]))
    }

    const hydratedMessages = messages.map((message) => ({
      ...message,
      vehicle: message.vehicleId ? vehicleById.get(message.vehicleId) ?? null : null,
    }))

    const total = messagesRes.count ?? 0
    return NextResponse.json({
      data: hydratedMessages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
