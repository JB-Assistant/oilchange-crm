import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { OttoLogo } from '@/components/ui/otto-logo'

export function LandingCta() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-otto-deep text-white">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm mb-8">
          <OttoLogo variant="head" size="sm" />
          <span className="text-otto-100">Ready to meet Otto?</span>
        </div>

        <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-6">
          Stop Losing Customers to Forgetfulness
        </h2>
        <p className="text-xl text-slate-300 mb-8">
          Join shops using Otto to automate follow-ups and increase retention by 20-30%.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 text-lg px-8 bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/25">
              Hire Otto — Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
        <p className="text-sm text-slate-400 mt-4">
          Setup takes 5 minutes. Otto works while you sleep.
        </p>
      </div>
    </section>
  )
}
