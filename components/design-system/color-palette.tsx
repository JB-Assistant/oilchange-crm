function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="text-center">
      <div className={`w-16 h-16 rounded-lg border ${className}`} />
      <p className="text-xs mt-1 text-muted-foreground">{name}</p>
    </div>
  )
}

export function ColorPalette() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Otto Blues</h3>
        <div className="flex flex-wrap gap-4">
          <Swatch name="50" className="bg-otto-50" />
          <Swatch name="100" className="bg-otto-100" />
          <Swatch name="200" className="bg-otto-200" />
          <Swatch name="300" className="bg-otto-300" />
          <Swatch name="400" className="bg-otto-400" />
          <Swatch name="500" className="bg-otto-500" />
          <Swatch name="600" className="bg-otto-600" />
          <Swatch name="700" className="bg-otto-700" />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Semantics</h3>
        <div className="flex flex-wrap gap-4">
          <Swatch name="success" className="bg-success" />
          <Swatch name="warning" className="bg-warning" />
          <Swatch name="danger" className="bg-danger" />
          <Swatch name="primary" className="bg-primary" />
          <Swatch name="muted" className="bg-muted" />
          <Swatch name="accent" className="bg-accent" />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Surfaces</h3>
        <div className="flex flex-wrap gap-4">
          <Swatch name="background" className="bg-background" />
          <Swatch name="card" className="bg-card" />
          <Swatch name="popover" className="bg-popover" />
          <Swatch name="secondary" className="bg-secondary" />
          <Swatch name="ink-900" className="bg-ink-900" />
          <Swatch name="ink-950" className="bg-ink-950" />
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Gradients</h3>
        <div className="flex flex-wrap gap-4">
          <div className="text-center">
            <div className="w-32 h-16 rounded-lg bg-otto-glow" />
            <p className="text-xs mt-1 text-muted-foreground">otto-glow</p>
          </div>
          <div className="text-center">
            <div className="w-32 h-16 rounded-lg bg-otto-deep" />
            <p className="text-xs mt-1 text-muted-foreground">otto-deep</p>
          </div>
          <div className="text-center">
            <div className="w-32 h-16 rounded-lg bg-otto-wash border" />
            <p className="text-xs mt-1 text-muted-foreground">otto-wash</p>
          </div>
        </div>
      </div>
    </div>
  )
}
