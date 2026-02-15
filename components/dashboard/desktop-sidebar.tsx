'use client'

import Link from 'next/link'
import { OttoLogo } from '@/components/ui/otto-logo'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useSidebar } from '@/hooks/use-sidebar'
import { NAV_ITEMS, SidebarNavItem } from './sidebar-nav'
import { SidebarToggle } from './sidebar-toggle'
import { cn } from '@/lib/utils'

export function DesktopSidebar() {
  const { isCollapsed } = useSidebar()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.devOnly || process.env.NODE_ENV === 'development',
  )

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col border-r bg-sidebar text-sidebar-foreground h-screen sticky top-0 transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex items-center border-b border-sidebar-border h-16 shrink-0',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          {isCollapsed ? (
            <OttoLogo variant="monogram" size="md" />
          ) : (
            <>
              <OttoLogo variant="full" size="sm" className="dark:hidden" />
              <div className="hidden dark:flex items-center gap-2">
                <OttoLogo variant="monogram" size="md" />
                <div className="flex flex-col leading-none">
                  <span className="font-heading font-bold text-base text-sidebar-foreground">Otto</span>
                  <span className="font-heading font-bold text-base text-sidebar-primary">ManagerPro</span>
                </div>
              </div>
            </>
          )}
        </Link>
        {!isCollapsed && <SidebarToggle />}
      </div>

      <TooltipProvider delayDuration={0}>
        <nav className={cn('flex-1 space-y-1 py-4', isCollapsed ? 'px-2' : 'px-3')}>
          {isCollapsed && (
            <div className="flex justify-center mb-1">
              <SidebarToggle />
            </div>
          )}
          {visibleItems.map((item) => (
            <SidebarNavItem key={item.href} item={item} collapsed={isCollapsed} />
          ))}
        </nav>
      </TooltipProvider>

    </aside>
  )
}
