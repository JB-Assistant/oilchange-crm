'use client'

export const dynamic = 'force-dynamic'

import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/breadcrumbs'
import { OttoLogo } from '@/components/ui/otto-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  LayoutDashboard,
  Users,
  Wrench,
  Upload,
  Settings,
  Menu,
  Bell,
  Palette,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-card">
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

            <Link href="/dashboard" className="flex items-center gap-2">
              <OttoLogo variant="monogram" size="md" />
              <span className="font-heading font-bold text-xl hidden sm:inline">OttoManagerPro</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <OrganizationSwitcher
              hidePersonal
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "px-3 py-2 border rounded-md hover:bg-accent"
                }
              }}
            />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 border-r bg-card min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-2">
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
              Dashboard
            </NavItem>
            <NavItem href="/customers" icon={<Users className="w-4 h-4" />}>
              Customers
            </NavItem>
            <NavItem href="/services" icon={<Wrench className="w-4 h-4" />}>
              Services
            </NavItem>
            <NavItem href="/dashboard/reminders" icon={<Bell className="w-4 h-4" />}>
              SMS Reminders
            </NavItem>
            <NavItem href="/import" icon={<Upload className="w-4 h-4" />}>
              Import
            </NavItem>
            <NavItem href="/settings" icon={<Settings className="w-4 h-4" />}>
              Settings
            </NavItem>
            {process.env.NODE_ENV === 'development' && (
              <NavItem href="/design-system" icon={<Palette className="w-4 h-4" />}>
                Design System
              </NavItem>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Breadcrumbs />
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <Link href={href}>
      <Button variant="ghost" className="w-full justify-start gap-3 hover:bg-accent">
        {icon}
        {children}
      </Button>
    </Link>
  )
}

function MobileNav() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <OttoLogo variant="monogram" size="md" />
          <span className="font-heading font-bold text-xl">OttoManagerPro</span>
        </Link>
      </div>
      <nav className="p-4 space-y-2 flex-1">
        <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
          Dashboard
        </NavItem>
        <NavItem href="/customers" icon={<Users className="w-4 h-4" />}>
          Customers
        </NavItem>
        <NavItem href="/services" icon={<Wrench className="w-4 h-4" />}>
          Services
        </NavItem>
        <NavItem href="/dashboard/reminders" icon={<Bell className="w-4 h-4" />}>
          SMS Reminders
        </NavItem>
        <NavItem href="/import" icon={<Upload className="w-4 h-4" />}>
          Import
        </NavItem>
        <NavItem href="/settings" icon={<Settings className="w-4 h-4" />}>
          Settings
        </NavItem>
        {process.env.NODE_ENV === 'development' && (
          <NavItem href="/design-system" icon={<Palette className="w-4 h-4" />}>
            Design System
          </NavItem>
        )}
      </nav>
    </div>
  )
}
