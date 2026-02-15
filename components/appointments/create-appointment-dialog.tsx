'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'

interface CustomerOption { id: string; firstName: string; lastName: string; phone: string }
interface ServiceTypeOption { id: string; displayName: string; category: string; name: string }
type GroupedTypes = Record<string, ServiceTypeOption[]>

const selectCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function CreateAppointmentDialog() {
  const router = useRouter()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [customers, setCustomers] = useState<CustomerOption[]>([])
  const [groupedTypes, setGroupedTypes] = useState<GroupedTypes>({})
  const [customerId, setCustomerId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState(60)
  const [serviceTypeNames, setServiceTypeNames] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setLoadingData(true)
    Promise.all([
      fetch('/api/customers?limit=100').then((r) => r.json()),
      fetch('/api/service-types').then((r) => r.json()),
    ])
      .then(([custResult, types]: [{ data: CustomerOption[] }, ServiceTypeOption[]]) => {
        setCustomers(custResult.data)
        const grouped: GroupedTypes = {}
        for (const st of types) {
          const cat = st.category || 'general'
          if (!grouped[cat]) grouped[cat] = []
          grouped[cat].push(st)
        }
        setGroupedTypes(grouped)
      })
      .catch(() => addToast('Failed to load form data', 'destructive'))
      .finally(() => setLoadingData(false))
  }, [open, addToast])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setCustomerId(''); setScheduledAt(''); setDuration(60)
      setServiceTypeNames([]); setNotes('')
    }
  }

  function toggleServiceType(name: string) {
    setServiceTypeNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId, scheduledAt: new Date(scheduledAt).toISOString(),
          duration, serviceTypeNames, notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const body = (await res.json()) as { error?: string }
        throw new Error(body.error ?? 'Failed to create appointment')
      }
      addToast('Appointment created successfully', 'success')
      setOpen(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create appointment'
      addToast(msg, 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Create Appointment
          </DialogTitle>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appt-customer">Customer</Label>
              <select id="appt-customer" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required className={selectCls}>
                <option value="">Select a customer...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.phone})</option>
                ))}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appt-datetime">Date &amp; Time</Label>
                <Input id="appt-datetime" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appt-duration">Duration (minutes)</Label>
                <Input id="appt-duration" type="number" min={15} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Service Types</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border p-3 space-y-3">
                {Object.entries(groupedTypes).map(([category, types]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {category.replace(/_/g, ' ')}
                    </p>
                    {types.map((st) => (
                      <label key={st.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input type="checkbox" checked={serviceTypeNames.includes(st.name)} onChange={() => toggleServiceType(st.name)} className="rounded border-input" />
                        <span className="text-sm">{st.displayName}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appt-notes">Notes</Label>
              <Textarea id="appt-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes..." rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Appointment'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
