export const dynamic = 'force-dynamic'

import { Inter, Sora } from 'next/font/google'
import '../globals.css'
import { ThemeProvider } from '@/components/providers/theme-provider'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', weight: ['400', '600', '700'] })

export const metadata = {
  title: 'OttoManagerPro — Your AI Shop Manager',
  description: 'AI-powered CRM for auto repair shops. Stop losing customers to forgetfulness with automated service reminders and smart follow-ups.',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${sora.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
