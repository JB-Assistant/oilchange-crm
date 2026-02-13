export function TypographyShowcase() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Sora (Headings)</h3>
        <div className="space-y-3">
          <p className="font-heading text-4xl font-bold">Heading 4XL Bold</p>
          <p className="font-heading text-3xl font-bold">Heading 3XL Bold</p>
          <p className="font-heading text-2xl font-semibold">Heading 2XL Semibold</p>
          <p className="font-heading text-xl font-semibold">Heading XL Semibold</p>
          <p className="font-heading text-lg font-semibold">Heading LG Semibold</p>
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-4">Inter (Body)</h3>
        <div className="space-y-3">
          <p className="text-lg">Body Large — The quick brown fox jumps over the lazy dog.</p>
          <p className="text-base">Body Base — The quick brown fox jumps over the lazy dog.</p>
          <p className="text-sm">Body Small — The quick brown fox jumps over the lazy dog.</p>
          <p className="text-xs">Body XS — The quick brown fox jumps over the lazy dog.</p>
          <p className="text-sm text-muted-foreground">Muted — Secondary text for descriptions and labels.</p>
        </div>
      </div>
    </div>
  )
}
