'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface ImportResult {
  success: number
  errors: number
  duplicates: number
  message: string
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [preview, setPreview] = useState<string[][]>([])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFile(file)
      setResult(null)
      
      // Preview first few rows
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const rows = text.split('\n').slice(0, 6).map(row => row.split(','))
        setPreview(rows)
      }
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  async function handleImport() {
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: 0,
        errors: 1,
        duplicates: 0,
        message: 'Import failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  function downloadTemplate() {
    const headers = 'firstName,lastName,phone,email,vehicleYear,vehicleMake,vehicleModel,licensePlate,lastServiceDate,lastServiceMileage'
    const example = 'John,Doe,(555) 123-4567,john@example.com,2020,Toyota,Camry,ABC123,2025-01-15,45000'
    const csv = `${headers}\n${example}`
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'oilchange-crm-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Customers</h1>
        <p className="text-zinc-600 mt-1">Bulk import customers via CSV file</p>
      </div>

      {/* Template Download */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Need a template?</h3>
              <p className="text-sm text-zinc-600">Download our CSV template with the correct format</p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="w-4 h-4" />
              Download Template
            </Button>
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
                <p className="text-sm text-zinc-400">Maximum file size: 10MB</p>
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
                        {row.slice(0, 5).map((cell, j) => (
                          <td key={j} className="p-2 truncate max-w-[150px]">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
          <ul className="space-y-2 text-sm text-zinc-600">
            <li>• First row must contain column headers</li>
            <li>• Required columns: firstName, lastName, phone</li>
            <li>• Optional columns: email, vehicleYear, vehicleMake, vehicleModel, licensePlate, lastServiceDate, lastServiceMileage</li>
            <li>• Phone numbers will be formatted automatically</li>
            <li>• Duplicate detection is based on phone number</li>
            <li>• Dates should be in YYYY-MM-DD format</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
