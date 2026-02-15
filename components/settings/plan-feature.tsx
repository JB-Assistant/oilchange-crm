import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

interface PlanFeatureProps {
  name: string
  price: string
  features: string[]
  current: boolean
}

export function PlanFeature({ name, price, features, current }: PlanFeatureProps) {
  return (
    <div className={`p-4 border rounded-lg ${current ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{name}</span>
          {current && <Badge>Current</Badge>}
        </div>
        <span className="font-semibold">{price}</span>
      </div>
      <ul className="space-y-1">
        {features.map((feature, i) => (
          <li key={i} className="text-sm text-zinc-600 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )
}
