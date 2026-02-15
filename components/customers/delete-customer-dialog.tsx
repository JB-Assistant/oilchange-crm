'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/toast'

interface DeleteCustomerProps {
  customer: {
    id: string
    firstName: string
    lastName: string
  }
  onSuccess: () => void
}

export function DeleteCustomerDialog({ customer, onSuccess }: DeleteCustomerProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const fullName = `${customer.firstName} ${customer.lastName}`
  const isConfirmed = confirmText === fullName

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setConfirmText('')
    }
  }

  async function handleDelete() {
    if (!isConfirmed) return
    setLoading(true)

    try {
      const response = await fetch(`/api/customers?id=${customer.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json() as { error?: string }
        throw new Error(data.error ?? 'Failed to delete customer')
      }

      addToast('Customer deleted successfully', 'success')
      setOpen(false)
      onSuccess()
      router.push('/customers')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete customer'
      addToast(message, 'destructive')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete{' '}
            <span className="font-semibold text-foreground">{fullName}</span>{' '}
            and all associated vehicles, service records, and reminders.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="delete-confirm">
            Type <span className="font-mono font-semibold">{fullName}</span> to
            confirm
          </Label>
          <Input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={fullName}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
          >
            {loading ? 'Deleting...' : 'Delete Customer'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
