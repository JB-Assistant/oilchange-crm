'use client'

import { useTheme } from 'next-themes'
import { useRef, useState, useCallback } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

const modes = ['light', 'system', 'dark'] as const

const icons = {
  light: Sun,
  system: Monitor,
  dark: Moon,
} as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)

  const handleRef = useCallback((node: HTMLButtonElement | null) => {
    ref.current = node
    if (node) setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button ref={handleRef} variant="ghost" size="icon" className="h-9 w-9" disabled>
        <Monitor className="h-4 w-4" />
      </Button>
    )
  }

  const current = (theme ?? 'system') as (typeof modes)[number]
  const nextIndex = (modes.indexOf(current) + 1) % modes.length
  const next = modes[nextIndex]
  const Icon = icons[current]

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}
