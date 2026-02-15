'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ServiceTypeItem {
  name: string
  displayName: string
  category: string
  defaultMileageInterval: number | null
  defaultTimeIntervalDays: number | null
  reminderLeadDays: number
}

interface ServiceTypeListProps {
  serviceTypes: ServiceTypeItem[]
  onUpdate: (index: number, leadDays: number) => void
}

const CATEGORY_LABELS: Record<string, string> = {
  oil_change: 'Oil Change',
  tires: 'Tires',
  brakes: 'Brakes',
  transmission: 'Transmission',
  cooling: 'Cooling System',
  electrical: 'Electrical',
  filters: 'Filters',
  wipers: 'Wipers',
  fluids: 'Fluids',
  inspection: 'Inspection',
  general: 'General',
}

function formatInterval(type: ServiceTypeItem): string {
  const parts: string[] = []
  if (type.defaultMileageInterval) {
    parts.push(`${type.defaultMileageInterval.toLocaleString()} mi`)
  }
  if (type.defaultTimeIntervalDays) {
    const months = Math.round(type.defaultTimeIntervalDays / 30)
    parts.push(months >= 12 ? `${Math.round(months / 12)}yr` : `${months}mo`)
  }
  return parts.length > 0 ? `Every ${parts.join(' / ')}` : 'On demand'
}

export function ServiceTypeList({ serviceTypes, onUpdate }: ServiceTypeListProps) {
  // Group by category
  const grouped = serviceTypes.reduce<Record<string, { items: ServiceTypeItem[]; indices: number[] }>>((acc, st, i) => {
    const cat = st.category || 'general'
    if (!acc[cat]) acc[cat] = { items: [], indices: [] }
    acc[cat].items.push(st)
    acc[cat].indices.push(i)
    return acc
  }, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Types & Intervals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(grouped).map(([category, { items, indices }]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              {CATEGORY_LABELS[category] || category}
            </h4>
            <div className="space-y-2">
              {items.map((type, j) => (
                <div key={type.name} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{type.displayName}</p>
                    <p className="text-xs text-zinc-500">{formatInterval(type)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-zinc-500 whitespace-nowrap">Lead days</Label>
                    <Input
                      type="number"
                      value={type.reminderLeadDays}
                      onChange={(e) => onUpdate(indices[j], parseInt(e.target.value) || 14)}
                      className="w-20 h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
