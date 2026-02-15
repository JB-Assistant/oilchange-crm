import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { format } from '@/lib/format'
import Link from 'next/link'

interface UpcomingService {
  id: string
  nextDueDate: Date
  nextDueMileage: number
  vehicle: {
    year: number
    make: string
    model: string
    customer: {
      firstName: string
      lastName: string
    }
  }
}

export function UpcomingServices({ services }: { services: UpcomingService[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Services (Next 30 Days)
        </CardTitle>
        <Link href="/customers">
          <Button variant="ghost" size="sm">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-zinc-600 text-center py-8">No upcoming services in the next 30 days</p>
        ) : (
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg">
                <div>
                  <p className="font-medium">
                    {service.vehicle.customer.firstName} {service.vehicle.customer.lastName}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {service.vehicle.year} {service.vehicle.make} {service.vehicle.model}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{format.date(service.nextDueDate)}</p>
                  <p className="text-sm text-zinc-600">{service.nextDueMileage.toLocaleString()} mi</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
