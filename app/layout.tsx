export const dynamic = 'force-dynamic'

import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'OilChange Pro - Customer Follow-Up CRM',
  description: 'SaaS platform for auto repair shops to track customers and send service reminders',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <ToastProvider>
        <html lang="en">
          <body className={inter.className}>{children}</body>
        </html>
      </ToastProvider>
    </ClerkProvider>
  )
}
