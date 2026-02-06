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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Phone, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface FollowUpFormProps {
  customerId: string
  serviceRecordId: string
}

export function FollowUpForm({ customerId, serviceRecordId }: FollowUpFormProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    const formData = new FormData(e.currentTarget)
    
    try {
      const response = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          serviceRecordId,
          method: formData.get('method'),
          outcome: formData.get('outcome'),
          notes: formData.get('notes'),
          staffMember: formData.get('staffMember')
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
        <Button variant="ghost" size="sm" className="gap-2">
          <Phone className="w-4 h-4" />
          Log Follow-up
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Follow-up Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Method</Label>
              <Select name="method" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="text">Text Message</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select name="outcome" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Service Scheduled</SelectItem>
                  <SelectItem value="left_message">Left Message</SelectItem>
                  <SelectItem value="no_response">No Response</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="serviced_elsewhere">Serviced Elsewhere</SelectItem>
                  <SelectItem value="wrong_number">Wrong Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea 
              id="notes" 
              name="notes" 
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="staffMember">Staff Member</Label>
            <Input 
              id="staffMember" 
              name="staffMember" 
              placeholder="Your name"
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Log Follow-up'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
