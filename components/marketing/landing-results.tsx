import { TrendingUp, CheckCircle2 } from 'lucide-react'

export function LandingResults() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-otto-deep text-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-sm mb-6">
              <TrendingUp className="w-4 h-4 text-green-400" />
              Real Results from Real Shops
            </div>
            <h2 className="font-heading text-3xl font-bold mb-4">Shops Using Otto See Real Growth</h2>
            <p className="text-slate-300 text-lg mb-6">
              Don&apos;t just take our word for it. Otto tracks every metric so you can
              see exactly how much revenue he brings back to your shop.
            </p>
            <ul className="space-y-3">
              {[
                "Track retention rates by month and location",
                "See which reminders drive the most bookings",
                "Identify your most valuable customers",
                "Measure Otto's ROI in real dollars"
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="space-y-4">
              <ResultRow label="Customers Tracked" sublabel="This month" value="1,247" className="bg-white/10" />
              <ResultRow label="SMS Reminders Sent" sublabel="Otto working 24/7" value="342" className="bg-green-500/20 border border-green-500/30" labelColor="text-green-100" subColor="text-green-300" valueColor="text-green-400" />
              <ResultRow label="Appointments Booked" sublabel="From Otto reminders" value="89" className="bg-amber-500/20 border border-amber-500/30" labelColor="text-amber-100" subColor="text-amber-300" valueColor="text-amber-400" />
              <ResultRow label="Customer Retention" sublabel="+23% this month" value="94%" className="bg-otto-500/20 border border-otto-500/30" labelColor="text-otto-100" subColor="text-otto-300" valueColor="text-otto-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ResultRow({ label, sublabel, value, className, labelColor, subColor, valueColor }: {
  label: string; sublabel: string; value: string; className: string
  labelColor?: string; subColor?: string; valueColor?: string
}) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-lg ${className}`}>
      <div>
        <p className={`font-medium ${labelColor ?? ''}`}>{label}</p>
        <p className={`text-sm ${subColor ?? 'text-slate-400'}`}>{sublabel}</p>
      </div>
      <p className={`text-3xl font-bold ${valueColor ?? 'text-white'}`}>{value}</p>
    </div>
  )
}
