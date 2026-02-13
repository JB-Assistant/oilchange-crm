import Link from 'next/link'
import { OttoLogo } from '@/components/ui/otto-logo'

export function LandingFooter() {
  return (
    <footer className="py-12 px-4 sm:px-6 bg-ink-950 text-slate-400">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <OttoLogo variant="full" size="sm" />
          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            <Link href="/sign-up" className="hover:text-white transition-colors">Hire Otto</Link>
            <a href="mailto:hello@ottomanagerpro.com" className="hover:text-white transition-colors">Contact</a>
          </nav>
        </div>
        <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2026 OttoManagerPro. Otto never forgets a customer.</p>
        </div>
      </div>
    </footer>
  )
}
