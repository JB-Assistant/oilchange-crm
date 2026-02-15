'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface SidebarContextValue {
  isCollapsed: boolean
  toggle: () => void
  setCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const STORAGE_KEY = 'sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'true') setIsCollapsed(true)
  }, [])

  const setCollapsed = useCallback((collapsed: boolean) => {
    setIsCollapsed(collapsed)
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [])

  const toggle = useCallback(() => {
    setCollapsed(!isCollapsed)
  }, [isCollapsed, setCollapsed])

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider')
  return ctx
}
