export const dynamic = 'force-dynamic'

import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Plus } from 'lucide-react'
import { AddLocationForm } from '@/components/settings/add-location-form'

export default async function LocationsPage() {
  const { orgId } = await auth()
  if (!orgId) redirect('/sign-in')

  const locations = await prisma.location.findMany({
    where: { orgId },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Locations</h1>
        <p className="text-muted-foreground">Manage your shop locations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Location
          </CardTitle>
          <CardDescription>Add a new shop location to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <AddLocationForm />
        </CardContent>
      </Card>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No locations yet</h3>
            <p className="text-sm text-muted-foreground">
              Add your first shop location above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {locations.map((location) => (
            <Card key={location.id}>
              <CardContent className="flex items-start justify-between pt-6">
                <div className="space-y-1">
                  <p className="font-semibold">{location.name}</p>
                  {location.address && (
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                  )}
                  {location.phone && (
                    <p className="text-sm text-muted-foreground">{location.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {location.isDefault && <Badge>Default</Badge>}
                  {!location.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
