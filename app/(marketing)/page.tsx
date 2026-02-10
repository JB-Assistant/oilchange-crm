export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Brain, 
  Users, 
  Bell, 
  BarChart3, 
  Building2,
  ArrowRight,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Shield
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">GarageOSPro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/sign-in">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Start Free Trial</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-100 via-zinc-50 to-white" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-zinc-200/50 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-full text-sm mb-8">
            <span className="flex h-2 w-2 rounded-full bg-green-400" />
            Now with AI-Powered SMS Reminders
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-tight mb-6">
            Your Shop's Memory,<br />
            <span className="text-zinc-500">Automated</span>
          </h1>
          
          <p className="text-xl text-zinc-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop losing customers to forgetfulness. AI-powered follow-ups and service reminders 
            that keep your bays full and customers coming back.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 text-lg px-8">
                Start 14-Day Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                See How It Works
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-zinc-500 mt-4">No credit card required • Setup in 5 minutes</p>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">The Problem Every Shop Faces</h2>
            <p className="text-lg text-zinc-600 max-w-2xl mx-auto">
              Independent auto repair shops lose 30–50% of repeat business simply because 
              customers forget when their next service is due.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard 
              icon={<Users className="w-8 h-8 text-red-500" />}
              stat="30-50%"
              label="Lost Revenue"
              description="Of repeat business is lost to competitors or deferred maintenance"
            />
            <ProblemCard 
              icon={<Calendar className="w-8 h-8 text-orange-500" />}
              stat="3-5 Hours"
              label="Weekly Follow-ups"
              description="Manual calling and tracking takes time away from actual work"
            />
            <ProblemCard 
              icon={<BarChart3 className="w-8 h-8 text-zinc-400" />}
              stat="Zero"
              label="Visibility"
              description="No system to track who's due for service across locations"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Everything You Need to Run Your Shop</h2>
            <p className="text-lg text-zinc-600">
              Built for multi-location operations. Scale from 1 bay to 100.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Brain className="w-6 h-6" />}
              title="AI Service Tracking"
              description="Automatically calculates next service dates based on mileage and time intervals"
            />
            <FeatureCard 
              icon={<Bell className="w-6 h-6" />}
              title="SMS Reminders"
              description="Automated text messages at the perfect time. Customers reply to book instantly"
            />
            <FeatureCard 
              icon={<Building2 className="w-6 h-6" />}
              title="Multi-Location"
              description="Manage 2 bays or 20 locations from one dashboard. See performance across shops"
            />
            <FeatureCard 
              icon={<Users className="w-6 h-6" />}
              title="Customer CRM"
              description="Complete history of every vehicle, every service, every conversation"
            />
            <FeatureCard 
              icon={<BarChart3 className="w-6 h-6" />}
              title="Analytics Dashboard"
              description="Track retention rates, upcoming services, and shop performance in real-time"
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />}
              title="TCPA Compliant"
              description="Built-in consent management and opt-out handling keeps you legally protected"
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">How It Works</h2>
            <p className="text-lg text-zinc-600">From spreadsheet chaos to automated revenue in 3 steps</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              title="Import Your Customers"
              description="Upload your existing customer list via CSV. We handle the rest."
            />
            <StepCard 
              number="2"
              title="AI Monitors Due Dates"
              description="Our system tracks every vehicle and calculates when service is due."
            />
            <StepCard 
              number="3"
              title="Automatic Reminders"
              description="Customers get SMS reminders at the perfect time. They reply to book."
            />
          </div>
        </div>
      </section>

      {/* Multi-Location Highlight */}
      <section className="py-20 px-4 sm:px-6 bg-zinc-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-full text-sm mb-6">
                <Building2 className="w-4 h-4" />
                Built for Growth
              </div>
              <h2 className="text-3xl font-bold mb-4">One Dashboard. Unlimited Locations.</h2>
              <p className="text-zinc-400 text-lg mb-6">
                Whether you have 2 bays or 20 locations, GarageOSPro scales with you. 
                See performance across all shops, compare locations, and standardize your customer experience.
              </p>
              <ul className="space-y-3">
                {[
                  "Centralized customer database across locations",
                  "Location-specific performance tracking",
                  "Staff management and permissions",
                  "Consistent branding and messaging"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-zinc-800 rounded-2xl p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-700/50 rounded-lg">
                  <div>
                    <p className="font-medium">Downtown Location</p>
                    <p className="text-sm text-zinc-400">45 customers this month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">92%</p>
                    <p className="text-xs text-zinc-400">Retention</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-700/50 rounded-lg">
                  <div>
                    <p className="font-medium">Westside Shop</p>
                    <p className="text-sm text-zinc-400">38 customers this month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">88%</p>
                    <p className="text-xs text-zinc-400">Retention</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-zinc-700/50 rounded-lg">
                  <div>
                    <p className="font-medium">North Branch</p>
                    <p className="text-sm text-zinc-400">52 customers this month</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">95%</p>
                    <p className="text-xs text-zinc-400">Retention</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4 sm:px-6 bg-zinc-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 mb-4">Simple Pricing for Growing Shops</h2>
            <p className="text-lg text-zinc-600">Start free. Scale as you grow. No hidden fees.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="relative">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-2">Professional</h3>
                <p className="text-zinc-500 mb-6">For single-location shops</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-zinc-500">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Up to 1,000 customers",
                    "Unlimited SMS reminders",
                    "Basic analytics",
                    "1 location",
                    "Email support"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-zinc-900" />
                      <span className="text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up">
                  <Button className="w-full" variant="outline">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="relative border-zinc-900">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-zinc-900 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8">
                <h3 className="text-xl font-bold mb-2">Enterprise</h3>
                <p className="text-zinc-500 mb-6">For multi-location operations</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold">$149</span>
                  <span className="text-zinc-500">/month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {[
                    "Unlimited customers",
                    "Unlimited SMS reminders",
                    "Advanced analytics & reporting",
                    "Unlimited locations",
                    "Priority phone support",
                    "Custom integrations"
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-zinc-900" />
                      <span className="text-zinc-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up">
                  <Button className="w-full">Start Free Trial</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-center text-zinc-500 mt-8">
            14-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 sm:px-6 bg-zinc-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to Stop Losing Customers?
          </h2>
          <p className="text-xl text-zinc-400 mb-8">
            Join 200+ auto repair shops using GarageOSPro to automate follow-ups and increase retention.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="gap-2 text-lg px-8 bg-white text-zinc-900 hover:bg-zinc-100">
                Start Your Free Trial
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-zinc-500 mt-4">
            Setup takes 5 minutes. See results in your first month.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 bg-zinc-950 text-zinc-400">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">GarageOSPro</span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/sign-up" className="hover:text-white transition-colors">Start Trial</Link>
              <a href="mailto:hello@garageospro.com" className="hover:text-white transition-colors">Contact</a>
            </nav>
          </div>
          <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-sm">
            <p>© 2026 GarageOSPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProblemCard({ icon, stat, label, description }: { 
  icon: React.ReactNode
  stat: string
  label: string
  description: string 
}) {
  return (
    <Card className="text-center">
      <CardContent className="p-8">
        <div className="flex justify-center mb-4">{icon}</div>
        <p className="text-4xl font-bold text-zinc-900 mb-1">{stat}</p>
        <p className="font-semibold text-zinc-600 mb-2">{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </CardContent>
    </Card>
  )
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode
  title: string
  description: string 
}) {
  return (
    <Card className="hover:border-zinc-300 transition-colors">
      <CardContent className="p-6">
        <div className="p-3 bg-zinc-100 rounded-lg w-fit mb-4">
          {icon}
        </div>
        <h3 className="font-semibold text-lg mb-2">{title}</h3>
        <p className="text-zinc-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

function StepCard({ number, title, description }: { 
  number: string
  title: string
  description: string 
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-zinc-600">{description}</p>
    </div>
  )
}
