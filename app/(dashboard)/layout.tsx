'use client'

export const dynamic = 'force-dynamic'

import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { OttoLogo } from '@/components/ui/otto-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { SidebarProvider } from '@/hooks/use-sidebar'
import { DesktopSidebar } from '@/components/dashboard/desktop-sidebar'
import { MobileNav } from '@/components/dashboard/mobile-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-muted flex">
        <DesktopSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-50 border-b bg-card">
            <div className="flex h-16 items-center px-4 sm:px-6">
              <div className="flex items-center gap-4 flex-1">
                <Sheet>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0">
                    <MobileNav />
                  </SheetContent>
                </Sheet>

                <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
                  <OttoLogo variant="monogram" size="md" />
                  <span className="font-heading font-bold text-xl hidden sm:inline">
                    OttoManagerPro
                  </span>
                </Link>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <OrganizationSwitcher
                  hidePersonal
                  appearance={{
                    elements: {
                      organizationSwitcherTrigger:
                        'px-3 py-2 border rounded-md hover:bg-accent',
                    },
                  }}
                />
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Breadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
