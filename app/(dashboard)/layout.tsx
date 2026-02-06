import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { 
  LayoutDashboard, 
  Users, 
  Upload, 
  Settings, 
  Car,
  Menu
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
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white">
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
              <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl hidden sm:inline">OilChange Pro</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-4">
            <OrganizationSwitcher 
              hidePersonal
              appearance={{
                elements: {
                  organizationSwitcherTrigger: "px-3 py-2 border rounded-md hover:bg-zinc-50"
                }
              }}
            />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:block w-64 border-r bg-white min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="p-4 space-y-2">
            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
              Dashboard
            </NavItem>
            <NavItem href="/customers" icon={<Users className="w-4 h-4" />}>
              Customers
            </NavItem>
            <NavItem href="/import" icon={<Upload className="w-4 h-4" />}>
              Import
            </NavItem>
            <NavItem href="/settings" icon={<Settings className="w-4 h-4" />}>
              Settings
            </NavItem>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({ href, icon, children }: { href: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <Link href={href}>
      <Button variant="ghost" className="w-full justify-start gap-3">
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
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">OilChange Pro</span>
        </Link>
      </div>
      <nav className="p-4 space-y-2 flex-1">
        <NavItem href="/dashboard" icon={<LayoutDashboard className="w-4 h-4" />}>
          Dashboard
        </NavItem>
        <NavItem href="/customers" icon={<Users className="w-4 h-4" />}>
          Customers
        </NavItem>
        <NavItem href="/import" icon={<Upload className="w-4 h-4" />}>
          Import
        </NavItem>
        <NavItem href="/settings" icon={<Settings className="w-4 h-4" />}>
          Settings
        </NavItem>
      </nav>
    </div>
  )
}
