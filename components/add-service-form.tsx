'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'

interface ServiceTypeOption {
  name: string
  displayName: string
  category: string
  defaultMileageInterval: number | null
  defaultTimeIntervalDays: number | null
}

interface AddServiceFormProps {
  vehicleId: string
  customerId: string
}

export function AddServiceForm({ vehicleId, customerId }: AddServiceFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeOption[]>([])
  const [selectedType, setSelectedType] = useState('')
  const router = useRouter()
  const { addToast } = useToast()

  useEffect(() => {
    if (open && serviceTypes.length === 0) {
      fetch('/api/service-types')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setServiceTypes(data)
            if (data.length > 0) setSelectedType(data[0].name)
          }
        })
        .catch(() => {})
    }
  }, [open, serviceTypes.length])

  const selected = serviceTypes.find(st => st.name === selectedType)

  function formatInterval(st: ServiceTypeOption): string {
    const parts: string[] = []
    if (st.defaultTimeIntervalDays) {
      const months = Math.round(st.defaultTimeIntervalDays / 30)
      parts.push(months >= 12 ? `${Math.round(months / 12)} year${months >= 24 ? 's' : ''}` : `${months} months`)
    }
    if (st.defaultMileageInterval) {
      parts.push(`${st.defaultMileageInterval.toLocaleString()} miles`)
    }
    return parts.length > 0 ? parts.join(' or ') : 'No interval set'
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

    try {
      const response = await fetch('/api/service-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId,
          serviceDate: formData.get('serviceDate'),
          mileageAtService: parseInt(formData.get('mileageAtService') as string),
          serviceType: selectedType,
          notes: formData.get('notes')
        })
      })

      if (response.ok) {
        addToast('Service record added', 'success')
        setOpen(false)
        router.refresh()
      } else {
        addToast('Failed to add service record', 'destructive')
      }
    } catch {
      addToast('Failed to add service record', 'destructive')
    } finally {
      setLoading(false)
    }
  }

  // Group service types by category
  const grouped = serviceTypes.reduce<Record<string, ServiceTypeOption[]>>((acc, st) => {
    const cat = st.category || 'general'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(st)
    return acc
  }, {})

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Service Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serviceDate">Service Date</Label>
              <Input
                id="serviceDate"
                name="serviceDate"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mileageAtService">Mileage</Label>
              <Input
                id="mileageAtService"
                name="mileageAtService"
                type="number"
                placeholder="e.g. 50000"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type</Label>
            <select
              id="serviceType"
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            >
              {Object.entries(grouped).map(([category, types]) => (
                <optgroup key={category} label={category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}>
                  {types.map(st => (
                    <option key={st.name} value={st.name}>{st.displayName}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selected && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Next due: {formatInterval(selected)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Add Service Record'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
