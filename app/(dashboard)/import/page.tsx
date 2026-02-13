'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Upload, Download, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface ImportResult {
  success: number
  errors: number
  duplicates: number
  message: string
  format?: string
  details?: string[]
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<string[][]>([])
  const [smsConsent, setSmsConsent] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const dropped = acceptedFiles[0]
    if (dropped) {
      setFile(dropped)
      setResult(null)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const rows = text.split('\n').slice(0, 6).map(row => row.split(','))
        setPreview(rows)
      }
      reader.readAsText(dropped)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1,
  })

  async function handleImport() {
    if (!file) return

    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('smsConsent', String(smsConsent))

    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      setResult(data)
    } catch {
      setResult({
        success: 0,
        errors: 1,
        duplicates: 0,
        message: 'Import failed. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const headers = 'firstName,lastName,phone,email,vehicleYear,vehicleMake,vehicleModel,licensePlate,lastServiceDate,lastServiceMileage'
    const example = 'John,Doe,(555) 123-4567,john@example.com,2020,Toyota,Camry,ABC123,2025-01-15,45000'
    const csv = `${headers}\n${example}`

    downloadCSV(csv, 'oilchange-crm-template.csv')
  }

  function downloadShopTemplate() {
    const headers = 'Full Name,Phone,Year/Make/Model,VIN Code,Current Milleage,Repair Description'
    const example = 'John Doe,5551234567,2020 Toyota Camry,1HGBH41JXMN109186,45000,Oil Change 5W-30'
    const csv = `${headers}\n${example}`

    downloadCSV(csv, 'shop-format-template.csv')
  }

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Import Customers</h1>
        <p className="text-muted-foreground mt-1">Bulk import customers via CSV file</p>
      </div>

      {/* Template Download */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold mb-1">Need a template?</h3>
              <p className="text-sm text-zinc-600">Download a CSV template to get started</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="w-4 h-4" />
                Standard Template
              </Button>
              <Button variant="outline" onClick={downloadShopTemplate} className="gap-2">
                <FileText className="w-4 h-4" />
                Shop Format Template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-300 hover:border-zinc-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
            {isDragActive ? (
              <p className="text-zinc-900 font-medium">Drop the file here...</p>
            ) : (
              <>
                <p className="text-zinc-600 mb-2">
                  Drag and drop your CSV file here, or click to select
                </p>
                <p className="text-sm text-zinc-400">Supports both standard and shop formats</p>
              </>
            )}
          </div>

          {file && (
            <div className="p-4 bg-zinc-50 rounded-lg">
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-zinc-600">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          )}

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <p className="text-sm font-medium p-3 bg-zinc-50 border-b">Preview (first 5 rows)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={i === 0 ? 'bg-zinc-100 font-medium' : 'border-t'}>
                        {row.slice(0, 6).map((cell, j) => (
                          <td key={j} className="p-2 truncate max-w-[150px]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SMS Consent Toggle */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg">
            <div>
              <Label htmlFor="sms-consent" className="font-medium">SMS Consent</Label>
              <p className="text-sm text-zinc-500 mt-0.5">
                Opt in imported customers for SMS reminders
              </p>
            </div>
            <Switch
              id="sms-consent"
              checked={smsConsent}
              onCheckedChange={setSmsConsent}
            />
          </div>

          <Button
            onClick={handleImport}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Importing...' : 'Import Customers'}
          </Button>

          {result && (
            <div className={`p-4 rounded-lg ${result.errors > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.errors > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
                <span className="font-medium">{result.message}</span>
              </div>
              {result.format && (
                <p className="text-sm text-zinc-600 mb-3">
                  Detected format: <span className="font-medium">{result.format}</span>
                </p>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-2xl font-bold text-green-600">{result.success}</span>
                  <p className="text-zinc-600">Imported</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-yellow-600">{result.duplicates}</span>
                  <p className="text-zinc-600">Duplicates</p>
                </div>
                <div>
                  <span className="text-2xl font-bold text-red-600">{result.errors}</span>
                  <p className="text-zinc-600">Errors</p>
                </div>
              </div>
              {result.details && result.details.length > 0 && (
                <div className="mt-3 pt-3 border-t border-red-200">
                  <p className="text-sm font-medium text-red-700 mb-1">Error details:</p>
                  <ul className="space-y-1 text-sm text-red-600">
                    {result.details.map((detail, i) => (
                      <li key={i}>{detail}</li>
                    ))}
                  </ul>
                  {result.errors > result.details.length && (
                    <p className="text-xs text-red-400 mt-1">
                      Showing {result.details.length} of {result.errors} errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
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
    </div>
  )
}
