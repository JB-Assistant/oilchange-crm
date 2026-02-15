'use client'

import { ImportWizard } from '@/components/import/import-wizard'
import { ImportGuidelines } from '@/components/import/import-guidelines'

export default function ImportPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Import Customers</h1>
        <p className="text-muted-foreground mt-1">
          Upload CSV or Excel files with smart field mapping and data cleaning
        </p>
      </div>

      <ImportWizard />
      <ImportGuidelines />
    </div>
  )
}
