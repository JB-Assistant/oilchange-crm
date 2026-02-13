export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SmsComposeForm } from '@/components/sms-compose-form'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle } from 'lucide-react'

interface SmsPageProps {
  params: Promise<{ id: string }>
}

export default async function SmsPage({ params }: SmsPageProps) {
  const { orgId } = await auth()
  const { id } = await params

  if (!orgId) {
    redirect('/')
  }

  const [customer, org, templates, twilioConfig] = await Promise.all([
    prisma.customer.findFirst({
      where: { id, orgId },
      include: {
        vehicles: {
          include: {
            serviceRecords: {
              orderBy: { serviceDate: 'desc' },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { name: true, phone: true },
    }),
    prisma.reminderTemplate.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.twilioConfig.findUnique({
      where: { orgId },
      select: { isActive: true },
    }),
  ])

  if (!customer || !org) {
    notFound()
  }

  const twilioActive = twilioConfig?.isActive ?? false

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href={`/customers/${customer.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Send SMS</h1>
          <p className="text-sm text-zinc-600">
            {customer.firstName} {customer.lastName}
          </p>
        </div>
      </div>

      {!twilioActive && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1 text-sm">
            Twilio is not configured. Messages cannot be sent until you{' '}
            <Link href="/settings/sms" className="underline font-medium">
              configure SMS settings
            </Link>.
          </div>
        </div>
      )}

      <SmsComposeForm
        customer={{
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          smsConsent: customer.smsConsent,
        }}
        vehicles={customer.vehicles.map((v) => ({
          id: v.id,
          year: v.year,
          make: v.make,
          model: v.model,
          latestService: v.serviceRecords[0]
            ? {
                id: v.serviceRecords[0].id,
                serviceType: v.serviceRecords[0].serviceType,
                nextDueDate: v.serviceRecords[0].nextDueDate.toISOString(),
              }
            : null,
        }))}
        org={{ name: org.name, phone: org.phone ?? '' }}
        templates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          body: t.body,
        }))}
        twilioActive={twilioActive}
      />
    </div>
  )
}
