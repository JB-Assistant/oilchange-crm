"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

const BREADCRUMB_MAP: Record<string, string> = {
  "dashboard": "Dashboard",
  "ai": "AI Manager",
  "customers": "Customers",
  "new": "New",
  "settings": "Settings",
  "reminders": "SMS Reminders",
  "import": "Import",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length <= 1) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
      <Link href="/dashboard" className="hover:text-zinc-900 flex items-center gap-1">
        <Home className="w-4 h-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/")
        const isLast = index === segments.length - 1
        const label = BREADCRUMB_MAP[segment] || segment

        return (
          <div key={segment} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4" />
            {isLast ? (
              <span className="text-zinc-900 font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-zinc-900">
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
