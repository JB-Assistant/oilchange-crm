'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tag, X, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/toast'

interface CustomerTagsProps {
  customerId: string
  initialTags: string[]
}

export function CustomerTags({ customerId, initialTags }: CustomerTagsProps) {
  const { addToast } = useToast()
  const [tags, setTags] = useState<string[]>(initialTags)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingTag, setRemovingTag] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const tag = input.trim().toLowerCase()
    if (!tag || tags.includes(tag)) {
      setInput('')
      return
    }

    setAdding(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      })
      if (!res.ok) throw new Error('Failed to add tag')
      setTags((prev) => [...prev, tag])
      setInput('')
    } catch {
      addToast('Failed to add tag', 'destructive')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(tag: string) {
    setRemovingTag(tag)
    try {
      const res = await fetch(
        `/api/customers/${customerId}/tags?tag=${encodeURIComponent(tag)}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to remove tag')
      setTags((prev) => prev.filter((t) => t !== tag))
    } catch {
      addToast('Failed to remove tag', 'destructive')
    } finally {
      setRemovingTag(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="w-4 h-4" />
        Tags
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => handleRemove(tag)}
              disabled={removingTag === tag}
              className="ml-0.5 rounded-full p-0.5 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50"
              aria-label={`Remove ${tag} tag`}
            >
              {removingTag === tag ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </button>
          </Badge>
        ))}
        {tags.length === 0 && (
          <span className="text-sm text-zinc-500">No tags</span>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <Input
          placeholder="Add a tag..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={adding}
          className="max-w-[200px]"
        />
        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={adding || !input.trim()}
          aria-label="Add tag"
        >
          {adding ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
