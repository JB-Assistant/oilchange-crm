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
            <h4 className="font-medium text-sm mb-2">Supported Formats</h4>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>- CSV files (.csv)</li>
              <li>- Excel files (.xlsx, .xls)</li>
              <li>- QuickBooks exports (Display Name, Main Phone, etc.)</li>
              <li>- Shop management tools (Tekmetric, Mitchell, etc.)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Smart Field Mapping</h4>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>- Columns are auto-detected from common header names</li>
              <li>- Adjust mappings manually if auto-detection is wrong</li>
              <li>- Phone and a name field (First Name or Full Name) are required</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Data Cleaning</h4>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>- Phone numbers are auto-normalized (strips formatting, country code)</li>
              <li>- Full names are split into first/last name</li>
              <li>- Dates are normalized to standard format</li>
              <li>- Click any cell in the cleaning step to edit manually</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-sm mb-2">Duplicate Detection</h4>
            <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              <li>- Duplicates are detected by phone number</li>
              <li>- Both within-file and existing customer duplicates are shown</li>
              <li>- Duplicate rows are automatically skipped during import</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
