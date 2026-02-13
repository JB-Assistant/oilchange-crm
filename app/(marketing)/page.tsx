export const dynamic = 'force-dynamic'

import { LandingNav } from '@/components/marketing/landing-nav'
import { LandingHero } from '@/components/marketing/landing-hero'
import { LandingMeetOtto } from '@/components/marketing/landing-meet-otto'
import { LandingProblem, LandingHowItWorks, LandingFeatures } from '@/components/marketing/landing-sections'
import { LandingResults } from '@/components/marketing/landing-results'
import { LandingPricing } from '@/components/marketing/landing-pricing'
import { LandingCta } from '@/components/marketing/landing-cta'
import { LandingFooter } from '@/components/marketing/landing-footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <LandingHero />
      <LandingMeetOtto />
      <LandingProblem />
      <LandingHowItWorks />
      <LandingFeatures />
      <LandingResults />
      <LandingPricing />
      <LandingCta />
      <LandingFooter />
    </div>
  )
}
