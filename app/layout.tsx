export const dynamic = 'force-dynamic'

import { ClerkProvider } from '@clerk/nextjs'
import { Inter, Sora } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/providers/theme-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['400', '600', '700'] })

export const metadata = {
  title: 'OttoManagerPro — AI-Powered Shop Manager',
  description: 'SaaS platform for auto repair shops to track customers and send service reminders',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} ${sora.variable} font-sans antialiased`}>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
