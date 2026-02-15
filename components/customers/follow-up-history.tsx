import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from '@/lib/format'
import { MessageSquare, CheckCircle2, XCircle, HelpCircle } from 'lucide-react'

interface FollowUpRecord {
  id: string
  outcome: string
  method: string
  contactDate: Date
  notes: string | null
  staffMember: string | null
  serviceRecord: {
    vehicle: { year: number; make: string }
  } | null
}

function OutcomeIcon({ outcome }: { outcome: string }) {
  switch (outcome) {
    case 'scheduled':
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case 'not_interested':
    case 'wrong_number':
      return <XCircle className="w-4 h-4 text-red-500" />
    default:
      return <HelpCircle className="w-4 h-4 text-zinc-500" />
  }
}

export function FollowUpHistory({ records }: { records: FollowUpRecord[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Follow-Up History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <p className="text-zinc-600 text-center py-8">No follow-up records yet</p>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div key={record.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <OutcomeIcon outcome={record.outcome} />
                    <span className="font-medium capitalize">{record.outcome.replace('_', ' ')}</span>
                    <span className="text-zinc-400">&bull;</span>
                    <span className="text-sm text-zinc-600 capitalize">{record.method}</span>
                  </div>
                  <span className="text-sm text-zinc-600">{format.date(record.contactDate)}</span>
                </div>
                {record.serviceRecord && (
                  <p className="text-sm text-zinc-600 mb-2">
                    For: {record.serviceRecord.vehicle.year} {record.serviceRecord.vehicle.make}
                  </p>
                )}
                {record.notes && (
                  <p className="text-sm text-zinc-600 bg-zinc-50 p-2 rounded">{record.notes}</p>
                )}
                {record.staffMember && (
                  <p className="text-xs text-zinc-500 mt-2">Logged by: {record.staffMember}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
