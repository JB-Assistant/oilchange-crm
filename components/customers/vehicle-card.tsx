import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { format } from '@/lib/format'
import { Car, Calendar, Gauge } from 'lucide-react'
import { FollowUpForm } from '@/components/follow-up-form'
import { AddServiceForm } from '@/components/add-service-form'

interface ServiceRecord {
  id: string
  serviceType: string
  serviceDate: Date
  mileageAtService: number
  nextDueDate: Date
  nextDueMileage: number
  notes: string | null
}

interface VehicleCardProps {
  vehicle: {
    id: string
    year: number
    make: string
    model: string
    licensePlate: string | null
    serviceRecords: ServiceRecord[]
  }
  customerId: string
}

export function VehicleCard({ vehicle, customerId }: VehicleCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            {vehicle.year} {vehicle.make} {vehicle.model}
          </CardTitle>
          <AddServiceForm vehicleId={vehicle.id} customerId={customerId} />
        </div>
        {vehicle.licensePlate && (
          <p className="text-sm text-zinc-600">License: {vehicle.licensePlate}</p>
        )}
      </CardHeader>
      <CardContent>
        {vehicle.serviceRecords.length === 0 ? (
          <p className="text-zinc-600 text-center py-4">No service records yet</p>
        ) : (
          <div className="space-y-4">
            {vehicle.serviceRecords.map((record) => (
              <div key={record.id} className="p-4 bg-zinc-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">
                    {record.serviceType === 'oil_change' ? 'Oil Change' : record.serviceType}
                  </p>
                  <span className="text-sm text-zinc-600">{format.date(record.serviceDate)}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Gauge className="w-4 h-4" />
                    Service at {record.mileageAtService.toLocaleString()} mi
                  </div>
                  <div className="flex items-center gap-2 text-zinc-600">
                    <Calendar className="w-4 h-4" />
                    Next due: {format.date(record.nextDueDate)}
                  </div>
                </div>
                {record.notes && <p className="text-sm text-zinc-600 mt-2">{record.notes}</p>}
                <Separator className="my-3" />
                <FollowUpForm customerId={customerId} serviceRecordId={record.id} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
