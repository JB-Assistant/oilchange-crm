import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { OttoLogo } from '@/components/ui/otto-logo'
import { StatusBadge } from '@/components/status-badge'
import { CustomerStatus } from '@prisma/client'

export function ComponentShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Buttons</h3>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Status Badges</h3>
        <div className="flex flex-wrap gap-3">
          <StatusBadge status={CustomerStatus.overdue} />
          <StatusBadge status={CustomerStatus.due_now} />
          <StatusBadge status={CustomerStatus.due_soon} />
          <StatusBadge status={CustomerStatus.up_to_date} />
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <StatusBadge status={CustomerStatus.overdue} size="sm" />
          <StatusBadge status={CustomerStatus.due_now} size="sm" />
          <StatusBadge status={CustomerStatus.due_soon} size="sm" />
          <StatusBadge status={CustomerStatus.up_to_date} size="sm" />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Badges</h3>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Logo Variants</h3>
        <div className="flex flex-wrap items-end gap-6">
          <div className="text-center">
            <OttoLogo variant="full" size="md" />
            <p className="text-xs text-muted-foreground mt-2">full / md</p>
          </div>
          <div className="text-center">
            <OttoLogo variant="head" size="lg" />
            <p className="text-xs text-muted-foreground mt-2">head / lg</p>
          </div>
          <div className="text-center">
            <OttoLogo variant="head" size="md" />
            <p className="text-xs text-muted-foreground mt-2">head / md</p>
          </div>
          <div className="text-center">
            <OttoLogo variant="monogram" size="lg" />
            <p className="text-xs text-muted-foreground mt-2">monogram / lg</p>
          </div>
          <div className="text-center">
            <OttoLogo variant="monogram" size="md" />
            <p className="text-xs text-muted-foreground mt-2">monogram / md</p>
          </div>
          <div className="text-center">
            <OttoLogo variant="monogram" size="sm" />
            <p className="text-xs text-muted-foreground mt-2">monogram / sm</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Cards &amp; Inputs</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Sample Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                This card uses the semantic bg-card token and adapts to dark mode.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Form Elements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Text input..." />
              <Input placeholder="Disabled input..." disabled />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
