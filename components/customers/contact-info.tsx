import { Card, CardContent } from '@/components/ui/card'
import { format } from '@/lib/format'
import { Phone, Mail, Calendar } from 'lucide-react'

interface ContactInfoProps {
  phone: string
  email?: string | null
  createdAt: Date
}

export function ContactInfo({ phone, email, createdAt }: ContactInfoProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoItem icon={<Phone className="w-5 h-5 text-zinc-600" />} label="Phone" value={format.phone(phone)} />
          {email && <InfoItem icon={<Mail className="w-5 h-5 text-zinc-600" />} label="Email" value={email} />}
          <InfoItem icon={<Calendar className="w-5 h-5 text-zinc-600" />} label="Customer Since" value={format.date(createdAt)} />
        </div>
      </CardContent>
    </Card>
  )
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-sm text-zinc-600">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  )
}
