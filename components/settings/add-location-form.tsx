'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/toast'

const initial = { name: '', address: '', phone: '', isDefault: false }

export function AddLocationForm() {
  const [form, setForm] = useState(initial)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { addToast } = useToast()
  const set = (field: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          address: form.address || undefined,
          phone: form.phone || undefined,
          isDefault: form.isDefault,
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? 'Failed to add location')
      }
      addToast('Location added', 'success')
      setForm(initial)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add location'
      addToast(msg, 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loc-name">Name *</Label>
            <Input id="loc-name" required value={form.name}
              onChange={(e) => set('name', e.target.value)} placeholder="Main Shop" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-address">Address</Label>
            <Input id="loc-address" value={form.address}
              onChange={(e) => set('address', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc-phone">Phone</Label>
            <Input id="loc-phone" type="tel" value={form.phone}
              onChange={(e) => set('phone', e.target.value)} placeholder="(555) 123-4567" />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="loc-default" checked={form.isDefault}
              onCheckedChange={(v) => set('isDefault', v)} />
            <Label htmlFor="loc-default">Set as default</Label>
          </div>
          <Button type="submit" disabled={loading} className="w-full min-h-[44px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            {loading ? 'Adding...' : 'Add Location'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
