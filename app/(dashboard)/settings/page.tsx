export const dynamic = 'force-dynamic'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { Building2, CreditCard, Users, Bell, Shield, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react'
import { PlanFeature } from '@/components/settings/plan-feature'
import { BillingActions } from '@/components/settings/billing-actions'
import { assertSupabaseError } from '@/lib/supabase/otto'
import { createProductAdminClient, resolveOrgId } from '@/lib/supabase/server'

const TIER_LIMITS = {
  starter: { customers: 200, team: 1 },
  pro: { customers: Infinity, team: 3 },
  business: { customers: Infinity, team: Infinity }
} as const

export default async function SettingsPage() {
  const { orgId: clerkOrgId } = await auth()
  if (!clerkOrgId) redirect('/')

  const orgId = await resolveOrgId(clerkOrgId)
  const db = await createProductAdminClient()

  const [shopRes, aiConfigRes, customerCountRes] = await Promise.all([
    db
      .from('shops')
      .select('subscription_tier, subscription_status, stripe_customer_id, ai_personalization')
      .eq('org_id', orgId)
      .maybeSingle(),
    db
      .from('ai_configs')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle(),
    db
      .from('customers')
      .select('id', { count: 'exact' })
      .eq('org_id', orgId)
      .limit(1),
  ])

  assertSupabaseError(shopRes.error, 'Failed to fetch organization settings')
  assertSupabaseError(aiConfigRes.error, 'Failed to fetch AI settings')
  assertSupabaseError(customerCountRes.error, 'Failed to count customers')

  const shop = shopRes.data
  const aiConfig = aiConfigRes.data
  const currentTier = (shop?.subscription_tier || 'starter') as keyof typeof TIER_LIMITS
  const limits = TIER_LIMITS[currentTier]
  const customerCount = customerCountRes.count ?? 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your organization and subscription</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div><p className="text-sm text-zinc-600">Organization ID</p><p className="font-mono text-sm">{clerkOrgId}</p></div>
          <Separator />
          <div>
            <p className="text-sm text-zinc-600">Status</p>
            <Badge variant={shop?.subscription_status === 'active' ? 'default' : 'secondary'}>{shop?.subscription_status || 'trial'}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Subscription</CardTitle>
          <CardDescription>Manage your plan and billing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-zinc-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold capitalize">{currentTier} Plan</p>
                <p className="text-sm text-zinc-600">{shop?.subscription_status === 'trial' ? 'Free trial' : 'Active subscription'}</p>
              </div>
              <Badge variant="outline" className="capitalize">{currentTier}</Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Customers</span>
                <span className="font-medium">{customerCount} / {limits.customers === Infinity ? 'Unlimited' : limits.customers}</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-2">
                <div className="bg-zinc-900 h-2 rounded-full transition-all" style={{ width: `${Math.min((customerCount / (limits.customers === Infinity ? 100 : limits.customers)) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
          <div className="grid gap-3">
            <h4 className="font-medium text-sm">Available Plans</h4>
            <PlanFeature name="Otto Starter" price="$49/mo" features={['Up to 200 customers', '300 SMS/month', 'Basic dashboard', 'Email support']} current={currentTier === 'starter'} />
            <PlanFeature name="Otto Pro" price="$99/mo" features={['Unlimited customers', '1,000 SMS/month', 'AI personalized messages', 'Advanced analytics', 'Priority support']} current={currentTier === 'pro'} />
            <PlanFeature name="Otto Business" price="$199/mo" features={['Unlimited customers', '3,000 SMS/month', 'White-label & API access', 'Dedicated support + phone']} current={currentTier === 'business'} />
          </div>
          <BillingActions currentTier={currentTier} hasStripeCustomer={!!shop?.stripe_customer_id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Team Members</CardTitle>
          <CardDescription>Manage access to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600 mb-4">Team management is handled through Clerk. Visit your Clerk dashboard to add or remove team members.</p>
          <Button variant="outline">Open Clerk Dashboard</Button>
        </CardContent>
      </Card>

      <Link href="/ai" className="block group">
        <Card className="border-violet-200 dark:border-violet-500/30 transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              AI Shop Manager
              <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
            </CardTitle>
            <CardDescription>Configure your AI assistant for personalized SMS messages</CardDescription>
          </CardHeader>
          <CardContent>
            {aiConfig ? (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="capitalize">{aiConfig.provider}</span> connected
                {shop?.ai_personalization && <Badge variant="secondary" className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">Personalization on</Badge>}
              </div>
            ) : (
              <p className="text-sm text-zinc-600">No AI provider configured yet. Set up your AI assistant to get started.</p>
            )}
          </CardContent>
        </Card>
      </Link>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" />Notifications</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-zinc-600">Notification preferences will be available in a future update.</p></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" />Security</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <CheckCircle2 className="w-4 h-4 text-green-500" />Two-factor authentication available through Clerk
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
