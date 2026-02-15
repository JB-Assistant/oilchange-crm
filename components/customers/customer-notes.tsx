'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { StickyNote, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface Note {
  id: string
  body: string
  createdBy: string
  createdAt: string
}

interface CustomerNotesProps {
  customerId: string
}

export function CustomerNotes({ customerId }: CustomerNotesProps) {
  const { addToast } = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`)
      if (!res.ok) throw new Error('Failed to fetch notes')
      const data: Note[] = await res.json()
      setNotes(data)
    } catch {
      console.error('Failed to load notes')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })
      if (!res.ok) throw new Error('Failed to add note')
      const newNote: Note = await res.json()
      setNotes((prev) => [newNote, ...prev])
      setBody('')
    } catch {
      addToast('Failed to add note', 'destructive')
    } finally {
      setSubmitting(false)
    }
  }

  function formatTimestamp(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="w-5 h-5" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="Add a note..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={submitting}
            className="min-h-[80px]"
          />
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !body.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Note'
            )}
          </Button>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-zinc-600 text-center py-8">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-900"
              >
                <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                  <span>{note.createdBy}</span>
                  <span className="text-zinc-400">&bull;</span>
                  <span>{formatTimestamp(note.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
