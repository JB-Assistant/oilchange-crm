export const dynamic = 'force-dynamic'

import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'GarageOSPro — Your Shop\'s Memory, Automated',
  description: 'AI-powered CRM for auto repair shops. Stop losing customers to forgetfulness with automated service reminders and smart follow-ups.',
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
