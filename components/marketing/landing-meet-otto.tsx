import { OttoLogo } from '@/components/ui/otto-logo'
import { Calendar, MessageSquare, TrendingUp, Clock } from 'lucide-react'

export function LandingMeetOtto() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-card">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-otto-100 text-otto-600 rounded-full text-sm font-medium mb-6 dark:bg-otto-500/20 dark:text-otto-300">
              <OttoLogo variant="head" size="sm" />
              Who is Otto?
            </div>
            <h2 className="font-heading text-3xl font-bold mb-4">Your Best Employee Who Never Sleeps</h2>
            <p className="text-muted-foreground text-lg mb-6">
              Otto is an AI manager that works 24/7 to keep your customers coming back.
              He remembers every oil change, every brake job, and every customer&apos;s preferences.
            </p>
            <ul className="space-y-4">
              {[
                { icon: <Calendar className="w-5 h-5 text-otto-500" />, text: "Tracks every customer and their service history automatically" },
                { icon: <MessageSquare className="w-5 h-5 text-success" />, text: "Sends personalized SMS reminders at the perfect time" },
                { icon: <TrendingUp className="w-5 h-5 text-amber-500" />, text: "Identifies lost customers and brings them back" },
                { icon: <Clock className="w-5 h-5 text-muted-foreground" />, text: "Works 24/7 so you can focus on running your shop" }
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5">{item.icon}</div>
                  <span className="text-foreground/80">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-otto-50 to-otto-100/50 rounded-3xl p-8 border border-otto-200 dark:from-otto-500/10 dark:to-otto-500/5 dark:border-otto-500/20">
            <div className="bg-card rounded-2xl shadow-xl p-6 space-y-4 border">
              <div className="flex items-center gap-3 pb-4 border-b">
                <OttoLogo variant="head" size="md" />
                <div>
                  <p className="font-semibold">Otto</p>
                  <p className="text-xs text-muted-foreground">AI Shop Manager</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <span className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-xs text-success font-medium">Online</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">📋 Tracked 47 customers today</p>
                </div>
                <div className="bg-otto-50 dark:bg-otto-500/10 rounded-lg p-3">
                  <p className="text-sm text-otto-600 dark:text-otto-300">📱 Sent 12 SMS reminders</p>
                </div>
                <div className="bg-emerald-50 dark:bg-success/10 rounded-lg p-3">
                  <p className="text-sm text-emerald-700 dark:text-success">✅ 3 appointments booked</p>
                </div>
                <div className="bg-amber-50 dark:bg-warning/10 rounded-lg p-3">
                  <p className="text-sm text-amber-700 dark:text-warning">🎯 Found 5 lost customers to re-engage</p>
                </div>
              </div>

              <div className="pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">Otto works while you sleep</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
