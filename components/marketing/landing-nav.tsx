import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { OttoLogo } from '@/components/ui/otto-logo'

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <OttoLogo variant="full" size="sm" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/sign-in">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button className="bg-amber-500 hover:bg-amber-600 text-white shadow-md">Meet Otto</Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
