export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { prisma } from '@/lib/prisma'
import { 
  Building2, 
  CreditCard, 
  Users, 
  Bell,
  Shield,
  CheckCircle2
} from 'lucide-react'

export default async function SettingsPage() {
  const { orgId, userId } = await auth()
  
  if (!orgId) {
    redirect('/')
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId }
  })

  const tierLimits = {
    starter: { customers: 100, team: 1 },
    professional: { customers: 1000, team: 5 },
    enterprise: { customers: Infinity, team: Infinity }
  }

  const currentTier = (org?.subscriptionTier || 'starter') as keyof typeof tierLimits
  const limits = tierLimits[currentTier]

  const customerCount = await prisma.customer.count({ where: { orgId } })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and subscription</p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600">Organization ID</p>
              <p className="font-mono text-sm">{orgId}</p>
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-600">Status</p>
              <Badge variant={org?.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                {org?.subscriptionStatus || 'trial'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription
          </CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-zinc-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold capitalize">{currentTier} Plan</p>
                <p className="text-sm text-zinc-600">
                  {org?.subscriptionStatus === 'trial' ? 'Free trial' : 'Active subscription'}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">{currentTier}</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Customers</span>
                <span className="font-medium">{customerCount} / {limits.customers === Infinity ? 'Unlimited' : limits.customers}</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2">
                <div 
                  className="bg-zinc-900 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((customerCount / (limits.customers === Infinity ? 100 : limits.customers)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <h4 className="font-medium text-sm">Available Plans</h4>
            <PlanFeature 
              name="Starter" 
              price="$0" 
              features={['Up to 100 customers', 'Basic dashboard', 'Email support']}
              current={currentTier === 'starter'}
            />
            <PlanFeature 
              name="Professional" 
              price="$49/mo" 
              features={['Up to 1,000 customers', 'Advanced dashboard', 'Team collaboration', 'Priority support']}
              current={currentTier === 'professional'}
            />
            <PlanFeature 
              name="Enterprise" 
              price="$149/mo" 
              features={['Unlimited customers', 'API access', 'Custom integrations', 'Dedicated support']}
              current={currentTier === 'enterprise'}
            />
          </div>

          <div className="flex gap-3">
            <Button className="flex-1">Upgrade Plan</Button>
            <Button variant="outline" className="flex-1">View Billing</Button>
          </div>
        </CardContent>
      </Card>

      {/* Team Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Members
          </CardTitle>
          <CardDescription>Manage access to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 mb-4">
            Team management is handled through Clerk. Visit your Clerk dashboard to add or remove team members.
          </p>
          <Button variant="outline">Open Clerk Dashboard</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 mb-4">
            Notification preferences will be available in a future update.
          </p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Two-factor authentication available through Clerk
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PlanFeature({ 
  name, 
  price, 
  features, 
  current 
}: { 
  name: string
  price: string
  features: string[]
  current: boolean
}) {
  return (
    <div className={`p-4 border rounded-lg ${current ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {current && <Badge>Current</Badge>}
        </div>
        <span className="font-semibold">{price}</span>
      </div>
      <ul className="space-y-1">
        {features.map((feature, i) => (
          <li key={i} className="text-sm text-zinc-600 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
