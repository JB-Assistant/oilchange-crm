import { Card, CardContent } from '@/components/ui/card'
import { OttoLogo } from '@/components/ui/otto-logo'
import {
  Users,
  MessageSquare,
  BarChart3,
  Sparkles,
  Wrench,
  Clock,
  TrendingUp,
  Shield,
  Building2
} from 'lucide-react'

function ProblemCard({ icon, stat, label, description }: {
  icon: React.ReactNode; stat: string; label: string; description: string
}) {
  return (
    <Card className="text-center">
      <CardContent className="p-8">
        <div className="flex justify-center mb-4">{icon}</div>
        <p className="font-heading text-4xl font-bold mb-1">{stat}</p>
        <p className="font-semibold mb-2">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ number, icon, title, description }: {
  number: string; icon: React.ReactNode; title: string; description: string
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-otto-glow rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg">
        {icon}
      </div>
      <div className="inline-flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-bold mb-3">
        {number}
      </div>
      <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode; title: string; description: string
}) {
  return (
    <Card className="hover:border-otto-300 dark:hover:border-otto-500/40 transition-colors">
      <CardContent className="p-6">
        <div className="p-3 bg-muted rounded-xl w-fit mb-4">
          {icon}
        </div>
        <h3 className="font-heading font-semibold text-lg mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

export function LandingProblem() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-muted">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">The Problem Otto Solves</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Service shops lose 30–50% of repeat business because customers forget
            when their next service is due. Until now.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <ProblemCard
            icon={<Users className="w-8 h-8 text-danger" />}
            stat="30-50%"
            label="Lost Customers"
            description="Of customers don't return simply because they forget"
          />
          <ProblemCard
            icon={<Clock className="w-8 h-8 text-warning" />}
            stat="10+ Hours"
            label="Weekly Admin"
            description="Manual follow-ups, spreadsheets, and forgotten calls"
          />
          <ProblemCard
            icon={<TrendingUp className="w-8 h-8 text-otto-500" />}
            stat="$0"
            label="Visibility"
            description="No system to track who's due and when"
          />
        </div>
      </div>
    </section>
  )
}

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 dark:bg-success/20 dark:text-success rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            How It Works
          </div>
          <h2 className="font-heading text-3xl font-bold mb-4">Otto Runs Your Follow-Ups</h2>
          <p className="text-lg text-muted-foreground">From customer data to booked appointments — automatically</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <StepCard
            number="1"
            icon={<Wrench className="w-6 h-6" />}
            title="Connect Your Data"
            description="Import from QuickBooks, CSV, or enter manually. Otto learns your customer history."
          />
          <StepCard
            number="2"
            icon={<OttoLogo variant="head" size="sm" className="brightness-0 invert" />}
            title="Otto Monitors Everything"
            description="Otto tracks every customer, calculates due dates, and watches for patterns."
          />
          <StepCard
            number="3"
            icon={<MessageSquare className="w-6 h-6" />}
            title="Smart SMS Reminders"
            description="Otto sends personalized texts at the perfect time. Customers reply to book instantly."
          />
        </div>
      </div>
    </section>
  )
}

export function LandingFeatures() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-muted">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">Everything Otto Does</h2>
          <p className="text-lg text-muted-foreground">
            One AI manager that handles your entire customer retention system
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Users className="w-6 h-6 text-otto-500" />}
            title="Smart Customer Tracking"
            description="Otto remembers every customer, their vehicles, and service history. No spreadsheets needed."
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6 text-success" />}
            title="AI SMS Reminders"
            description="Personalized text messages sent at the perfect time. Customers reply to book instantly."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-amber-500" />}
            title="Lost Customer Recovery"
            description="Otto identifies customers who haven't returned and re-engages them automatically."
          />
          <FeatureCard
            icon={<BarChart3 className="w-6 h-6 text-otto-500" />}
            title="Retention Analytics"
            description="See exactly how many customers Otto brought back and your ROI in real-time."
          />
          <FeatureCard
            icon={<Building2 className="w-6 h-6 text-success" />}
            title="Multi-Location"
            description="One Otto manages all your locations. Track performance across shops from one dashboard."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6 text-muted-foreground" />}
            title="TCPA Compliant"
            description="Built-in consent management and opt-out handling. Otto keeps you legally protected."
          />
        </div>
      </div>
    </section>
  )
}
