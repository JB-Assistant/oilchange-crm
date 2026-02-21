export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

interface ReminderMessageRow {
  id: string
  customer_id: string | null
  body: string
  status: string
  scheduled_at: string
  sent_at: string | null
}

interface CustomerRow {
  id: string
  first_name: string
  last_name: string
  phone: string
}

export default async function RemindersPage() {
  const { userId, orgId: clerkOrgId } = await auth()

  if (!userId || !clerkOrgId) {
    redirect('/sign-in')
  }

  const orgId = await resolveOrgId(clerkOrgId)
  const db = await createProductAdminClient()
  const now = new Date()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [upcomingRes, todayRes, shopRes] = await Promise.all([
    db
      .from('reminder_messages')
      .select('id, customer_id, body, status, scheduled_at, sent_at')
      .eq('org_id', orgId)
      .eq('status', 'queued')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', inSevenDays.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(50),
    db
      .from('reminder_messages')
      .select('id, customer_id, body, status, scheduled_at, sent_at')
      .eq('org_id', orgId)
      .gte('sent_at', startOfToday().toISOString())
      .lt('sent_at', startOfTomorrow().toISOString()),
    db
      .from('shops')
      .select('reminder_enabled')
      .eq('org_id', orgId)
      .maybeSingle(),
  ])

  assertSupabaseError(upcomingRes.error, 'Failed to fetch upcoming reminders')
  assertSupabaseError(todayRes.error, 'Failed to fetch today reminders')
  assertSupabaseError(shopRes.error, 'Failed to fetch organization reminder settings')

  const upcomingMessages = (upcomingRes.data ?? []) as ReminderMessageRow[]
  const todayMessages = (todayRes.data ?? []) as ReminderMessageRow[]
  const shop = shopRes.data

  const customerIds = Array.from(new Set(
    upcomingMessages.map((message) => message.customer_id).filter((id): id is string => Boolean(id))
  ))

  let customerById = new Map<string, CustomerRow>()
  if (customerIds.length > 0) {
    const customersRes = await db
      .from('customers')
      .select('id, first_name, last_name, phone')
      .in('id', customerIds)

    assertSupabaseError(customersRes.error, 'Failed to fetch reminder customers')
    customerById = new Map(((customersRes.data ?? []) as CustomerRow[]).map((customer) => [customer.id, customer]))
  }

  const deliveredCount = todayMessages.filter((message) => message.status === 'delivered').length
  const failedCount = todayMessages.filter((message) => message.status === 'failed' || message.status === 'undelivered').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SMS Reminders</h1>
        <div className="flex gap-4">
          <a
            href="/settings/reminders"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            Configure Reminders
          </a>
          <a
            href="/settings/sms"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            SMS Settings
          </a>
        </div>
      </div>

      {!shop?.reminder_enabled && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">
            <strong>Reminders are disabled.</strong>{' '}
            <a href="/settings/reminders" className="underline">
              Enable reminders
            </a>{' '}
            to start sending SMS notifications.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Sent Today</p>
          <p className="text-2xl font-bold">{todayMessages.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Delivered</p>
          <p className="text-2xl font-bold text-green-600">{deliveredCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Upcoming (7 days)</p>
          <p className="text-2xl font-bold">{upcomingMessages.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Upcoming Reminders</h2>
        </div>
        {upcomingMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No upcoming reminders scheduled.
          </div>
        ) : (
          <div className="divide-y">
            {upcomingMessages.map((message) => {
              const customer = message.customer_id ? customerById.get(message.customer_id) : undefined
              return (
                <div key={message.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {customer?.first_name} {customer?.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {customer?.phone}
                    </p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                      {message.body}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Queued
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(message.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function startOfTomorrow(): Date {
  const date = startOfToday()
  date.setDate(date.getDate() + 1)
  return date
}
