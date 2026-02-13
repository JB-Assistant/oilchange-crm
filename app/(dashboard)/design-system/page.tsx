import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ColorPalette } from '@/components/design-system/color-palette'
import { TypographyShowcase } from '@/components/design-system/typography-showcase'
import { ComponentShowcase } from '@/components/design-system/component-showcase'

export default function DesignSystemPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="font-heading text-3xl font-bold">Design System</h1>
        <p className="text-muted-foreground mt-1">
          Otto Design System v2 — colors, typography, and components
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <ColorPalette />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Typography</CardTitle>
        </CardHeader>
        <CardContent>
          <TypographyShowcase />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Components</CardTitle>
        </CardHeader>
        <CardContent>
          <ComponentShowcase />
        </CardContent>
      </Card>
    </div>
  )
}
