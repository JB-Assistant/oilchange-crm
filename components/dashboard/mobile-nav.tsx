'use client'

import Link from 'next/link'
import { OttoLogo } from '@/components/ui/otto-logo'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NAV_ITEMS, SidebarNavItem } from './sidebar-nav'

export function MobileNav() {
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.devOnly || process.env.NODE_ENV === 'development',
  )

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <OttoLogo variant="monogram" size="md" />
          <span className="font-heading font-bold text-xl">OttoManagerPro</span>
        </Link>
      </div>
      <TooltipProvider>
        <nav className="p-3 space-y-1 flex-1">
          {visibleItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} collapsed={false} />
          ))}
        </nav>
      </TooltipProvider>
    </div>
  )
}
