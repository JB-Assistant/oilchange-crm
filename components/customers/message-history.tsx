'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight } from 'lucide-react'

interface MessageHistoryProps {
  customerId: string
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  status: string
  sentAt: string | null
  createdAt: string
  fromPhone: string | null
  toPhone: string | null
  vehicle: { year: number; make: string; model: string } | null
}

interface MessagesResponse {
  messages: Message[]
  totalPages: number
}

function statusVariant(status: string) {
  switch (status) {
    case 'delivered': return 'outline' as const
    case 'sent': return 'default' as const
    case 'failed': return 'destructive' as const
    default: return 'secondary' as const
  }
}

function statusClass(status: string) {
  if (status === 'delivered') return 'border-green-500 text-green-700'
  if (status === 'sent') return 'bg-blue-500'
  return ''
}

export function MessageHistory({ customerId }: MessageHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true)
      try {
        const res = await fetch(`/api/customers/${customerId}/messages?page=${page}&limit=15`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data: MessagesResponse = await res.json()
        setMessages(data.messages)
        setTotalPages(data.totalPages)
      } catch {
        setMessages([])
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [customerId, page])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Message History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <MessageSquare className="h-10 w-10" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOutbound = msg.direction === 'outbound'
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        isOutbound ? 'bg-blue-50 dark:bg-blue-950' : 'bg-green-50 dark:bg-green-950'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        {isOutbound ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-blue-600" />
                        ) : (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                        )}
                        <Badge variant={statusVariant(msg.status)} className={statusClass(msg.status)}>
                          {msg.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{msg.body}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.sentAt ?? msg.createdAt).toLocaleString()}
                        </span>
                        {msg.vehicle && (
                          <span className="text-xs text-muted-foreground">
                            {msg.vehicle.year} {msg.vehicle.make} {msg.vehicle.model}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
