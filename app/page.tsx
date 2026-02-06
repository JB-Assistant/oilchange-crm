import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Car, 
  Calendar, 
  Users, 
  Bell, 
  BarChart3, 
  Phone, 
  CheckCircle2,
  ArrowRight,
  Star
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">OilChange Pro</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/sign-in" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
                Sign In
              </Link>
              <Link href="/sign-up">
                <Button>Get Started Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 text-sm font-medium text-zinc-700 mb-8">
            <Star className="w-4 h-4 text-yellow-500" />
            Trusted by 500+ auto repair shops
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 mb-6 leading-tight">
            Never Lose a Customer to<br />
            <span className="text-zinc-600">Forgotten Oil Changes</span>
          </h1>
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10">
            The intelligent CRM that tracks your customers' service schedules, 
            sends timely reminders, and helps you bring them back before they go elsewhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16 pt-16 border-t">
            <div>
              <div className="text-3xl font-bold text-zinc-900">40%</div>
              <div className="text-sm text-zinc-600">Increase in Returns</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900">5min</div>
              <div className="text-sm text-zinc-600">Daily Setup Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900">98%</div>
              <div className="text-sm text-zinc-600">Customer Retention</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">
              Everything You Need to Keep Customers Coming Back
            </h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Built specifically for auto repair shops, our CRM handles the 
              busy work so you can focus on what you do best.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Calendar className="w-6 h-6" />}
              title="Smart Scheduling"
              description="Automatic 3-month or 5,000-mile reminders. Whichever comes first, we'll let you know."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6" />}
              title="Customer Management"
              description="Complete customer profiles with vehicles, service history, and contact preferences."
            />
            <FeatureCard
              icon={<Bell className="w-6 h-6" />}
              title="Follow-Up Tracking"
              description="Log every call, text, and email. Track outcomes and never drop the ball."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Visual Dashboard"
              description="Color-coded status indicators show who's overdue, due soon, or up to date at a glance."
            />
            <FeatureCard
              icon={<Phone className="w-6 h-6" />}
              title="Bulk Import"
              description="Import your existing customer list via CSV. We handle duplicates and validation."
            />
            <FeatureCard
              icon={<CheckCircle2 className="w-6 h-6" />}
              title="Team Collaboration"
              description="Multiple staff members can log activities and see customer history in real-time."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">How It Works</h2>
            <p className="text-lg text-zinc-600">Get started in minutes, not hours</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <StepCard
              number="1"
              title="Import Customers"
              description="Upload your existing customer list or add them one by one"
            />
            <StepCard
              number="2"
              title="Log Services"
              description="Record each oil change with date and mileage"
            />
            <StepCard
              number="3"
              title="Get Alerts"
              description="See who's due for service with color-coded notifications"
            />
            <StepCard
              number="4"
              title="Follow Up"
              description="Call, text, or email customers and log the results"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-zinc-600">Start free, upgrade when you're ready</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="$0"
              period="for 14 days"
              description="Perfect for trying out the platform"
              features={[
                'Up to 100 customers',
                'Basic dashboard',
                'Email support',
                'CSV import'
              ]}
              cta="Start Free Trial"
              popular={false}
            />
            <PricingCard
              name="Professional"
              price="$49"
              period="/month"
              description="For growing auto repair shops"
              features={[
                'Up to 1,000 customers',
                'Advanced dashboard',
                'Priority support',
                'Team collaboration',
                'Custom reminders'
              ]}
              cta="Get Started"
              popular={true}
            />
            <PricingCard
              name="Enterprise"
              price="$149"
              period="/month"
              description="For multi-location shops"
              features={[
                'Unlimited customers',
                'All Pro features',
                'Dedicated support',
                'API access',
                'Custom integrations',
                'SSO & advanced security'
              ]}
              cta="Contact Sales"
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Retain More Customers?</h2>
          <p className="text-xl text-zinc-400 mb-8">
            Join hundreds of auto repair shops already using OilChange Pro
          </p>
          <Link href="/sign-up">
            <Button size="lg" variant="secondary" className="gap-2">
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-sm text-zinc-500 mt-4">No credit card required. 14-day free trial.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">OilChange Pro</span>
            </div>
            <p className="text-sm text-zinc-600">
              © 2025 OilChange Pro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="border-zinc-200 hover:border-zinc-300 transition-colors">
      <CardContent className="p-6">
        <div className="w-12 h-12 bg-zinc-100 rounded-lg flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-zinc-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-zinc-600 text-sm">{description}</p>
    </div>
  )
}

function PricingCard({ 
  name, 
  price, 
  period, 
  description, 
  features, 
  cta, 
  popular 
}: { 
  name: string
  price: string
  period: string
  description: string
  features: string[]
  cta: string
  popular: boolean
}) {
  return (
    <Card className={`relative ${popular ? 'border-zinc-900 shadow-lg' : 'border-zinc-200'}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-zinc-900 text-white text-xs font-medium px-3 py-1 rounded-full">
            Most Popular
          </span>
        </div>
      )}
      <CardContent className="p-6">
        <h3 className="font-semibold text-lg mb-2">{name}</h3>
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-zinc-600">{period}</span>
        </div>
        <p className="text-sm text-zinc-600 mb-6">{description}</p>
        <ul className="space-y-3 mb-6">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
        <Button className="w-full" variant={popular ? 'default' : 'outline'}>
          {cta}
        </Button>
      </CardContent>
    </Card>
  )
}
