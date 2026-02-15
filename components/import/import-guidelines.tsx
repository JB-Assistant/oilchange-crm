import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function ImportGuidelines() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Guidelines</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Standard Format</h4>
            <ul className="space-y-1 text-sm text-zinc-600">
              <li>- Required: firstName, lastName, phone</li>
              <li>- Optional: email, vehicleYear, vehicleMake, vehicleModel, licensePlate, lastServiceDate, lastServiceMileage</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Shop Format (auto-detected)</h4>
            <ul className="space-y-1 text-sm text-zinc-600">
              <li>- Required: Phone</li>
              <li>- Optional: Full Name, Year/Make/Model, VIN Code, Current Milleage, Repair Description</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">General</h4>
            <ul className="space-y-1 text-sm text-zinc-600">
              <li>- Format is auto-detected from column headers</li>
              <li>- Phone numbers are cleaned automatically (country code stripped)</li>
              <li>- Duplicate detection is based on phone number</li>
              <li>- Dates should be in YYYY-MM-DD format</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
