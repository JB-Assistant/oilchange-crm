'use client'

import { useState } from 'react'
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

interface AddServiceFormProps {
  vehicleId: string
  customerId: string
}

export function AddServiceForm({ vehicleId, customerId }: AddServiceFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
          serviceType: formData.get('serviceType'),
          notes: formData.get('notes')
        })
      })
      
      if (response.ok) {
        setOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

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
            <Input 
              id="serviceType" 
              name="serviceType" 
              defaultValue="oil_change"
              placeholder="e.g. Oil Change"
              required
            />
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Next due date will be automatically calculated (3 months or 5,000 miles)
            </p>
          </div>
          
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
