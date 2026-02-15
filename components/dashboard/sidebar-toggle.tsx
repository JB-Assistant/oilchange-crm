'use client'

import { Button } from '@/components/ui/button'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { useSidebar } from '@/hooks/use-sidebar'

export function SidebarToggle() {
  const { isCollapsed, toggle } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent"
      aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? (
        <PanelLeft className="h-4 w-4" />
      ) : (
        <PanelLeftClose className="h-4 w-4" />
      )}
    </Button>
  )
}
