import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OttoLogo } from '@/components/ui/otto-logo'
import { ArrowRight, Sparkles } from 'lucide-react'

export function LandingHero() {
  return (
    <section className="relative pt-20 pb-32 px-4 sm:px-6 overflow-hidden bg-otto-deep">

      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-otto-500/20 border border-otto-400/30 rounded-full text-sm mb-8 backdrop-blur-sm">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-otto-100">Now with AI-Powered Customer Retention</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          Meet <OttoLogo variant="mascot" size="lg" className="inline-block align-middle relative -top-[0.1em] drop-shadow-[0_0_24px_rgba(59,130,246,0.4)]" /><span className="text-transparent bg-clip-text bg-gradient-to-r from-otto-300 to-amber-400">tto</span>,<br />
          Your AI Shop Manager
        </h1>

        <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          Otto automatically tracks your customers, sends smart service reminders,
          and brings them back before they go to competitors. The manager who
          never sleeps, never forgets a customer, and helps you grow 20-30%.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/sign-up">
            <Button size="lg" className="gap-2 text-lg px-8 bg-amber-500 hover:bg-amber-600 text-white shadow-xl shadow-amber-500/25">
              Hire Otto — Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="text-lg px-8 border-slate-400 text-slate-200 hover:bg-slate-800 hover:text-white">
              See Otto in Action
            </Button>
          </Link>
        </div>

        <p className="text-sm text-slate-400 mt-4">No credit card required &bull; Setup in 5 minutes &bull; Cancel anytime</p>

        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-12 pt-12 border-t border-slate-700">
          <div>
            <p className="font-heading text-3xl font-bold text-white">20-30%</p>
            <p className="text-sm text-slate-400">More Repeat Customers</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-bold text-white">15 hrs</p>
            <p className="text-sm text-slate-400">Saved Per Week</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-bold text-white">24/7</p>
            <p className="text-sm text-slate-400">Otto Never Sleeps</p>
          </div>
        </div>
      </div>
    </section>
  )
}
