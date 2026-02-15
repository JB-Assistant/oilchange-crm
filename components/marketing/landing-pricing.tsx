import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'

function PricingCard({ name, audience, price, priceSuffix, features, cta, highlighted }: {
  name: string; audience: string; price: string; priceSuffix: string
  features: string[]; cta: string; highlighted?: boolean
}) {
  return (
    <Card className={highlighted ? 'relative border-otto-500 shadow-xl shadow-otto-500/10' : 'relative'}>
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-otto-500 text-white px-4 py-1 rounded-full text-sm font-medium">
            Most Popular
          </span>
        </div>
      )}
      <CardContent className="p-8">
        <h3 className="font-heading text-xl font-bold mb-2">{name}</h3>
        <p className="text-muted-foreground mb-6">{audience}</p>
        <div className="flex items-baseline gap-1 mb-6">
          <span className="font-heading text-4xl font-bold">{price}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-6">{priceSuffix}</p>
        <ul className="space-y-3 mb-8">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-otto-500" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Link href="/sign-up">
          <Button className={`w-full ${highlighted ? 'bg-otto-500 hover:bg-otto-600 text-white' : ''}`} variant={highlighted ? 'default' : 'outline'}>
            {cta}
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export function LandingPricing() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl font-bold mb-4">Hire Otto</h2>
          <p className="text-lg text-muted-foreground">Choose the plan that fits your shop. Otto works 24/7 on all plans.</p>
        </div>

        <div className="mx-auto max-w-5xl mb-10 rounded-lg border border-otto-500/30 bg-otto-500/5 p-4 text-center">
          <p className="font-medium text-otto-600 dark:text-otto-400">
            14-day free trial — full Pro features, 50 SMS included, no credit card required
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingCard
            name="Otto Starter"
            audience="For single-location shops"
            price="$49"
            priceSuffix="/month"
            features={["Up to 200 customers", "300 SMS/month included", "Template-based messages", "Basic dashboard", "Email support"]}
            cta="Start Free Trial"
          />
          <PricingCard
            name="Otto Pro"
            audience="For growing shops"
            price="$99"
            priceSuffix="/month"
            features={["Unlimited customers", "1,000 SMS/month included", "AI personalized messages", "Up to 3 locations", "Advanced analytics", "Custom reminder rules", "Priority support"]}
            cta="Start Free Trial"
            highlighted
          />
          <PricingCard
            name="Otto Business"
            audience="For chains & franchises"
            price="$199"
            priceSuffix="/month"
            features={["Unlimited customers", "3,000 SMS/month included", "Premium AI models", "Unlimited locations", "White-label option", "API access", "Dedicated support + phone", "Dedicated onboarding"]}
            cta="Start Free Trial"
          />
        </div>

        <p className="text-center text-muted-foreground mt-8">
          Need more SMS? Just $0.04/message beyond your plan limit. All plans include a 30-day money-back guarantee.
        </p>
      </div>
    </section>
  )
}
