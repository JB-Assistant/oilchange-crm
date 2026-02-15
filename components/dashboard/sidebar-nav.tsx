'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  LayoutDashboard,
  Users,
  Wrench,
  Upload,
  Settings,
  Bell,
  Calendar,
  Palette,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemConfig {
  href: string
  label: string
  icon: LucideIcon
  devOnly?: boolean
}

export const NAV_ITEMS: NavItemConfig[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ai', label: 'AI Manager', icon: Sparkles },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/services', label: 'Services', icon: Wrench },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/dashboard/reminders', label: 'SMS Reminders', icon: Bell },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/design-system', label: 'Design System', icon: Palette, devOnly: true },
]

export function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItemConfig
  collapsed: boolean
}) {
  const pathname = usePathname()
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  const button = (
    <Button
      variant="ghost"
      className={cn(
        'w-full gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed ? 'justify-center px-2' : 'justify-start',
        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Button>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href}>{button}</Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return <Link href={item.href}>{button}</Link>
}
