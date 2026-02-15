'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { parseFile } from '@/lib/import/parse-file'
import type { ParsedFile } from '@/lib/import/types'

interface StepUploadProps {
  parsedFile: ParsedFile | null
  onFileParsed: (file: ParsedFile) => void
}

export function StepUpload({ parsedFile, onFileParsed }: StepUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0]
    if (!file) return

    setError(null)
    setParsing(true)
    try {
      const result = await parseFile(file)
      onFileParsed(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setParsing(false)
    }
  }, [onFileParsed])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  function downloadCSV(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-semibold text-sm">Download a template</h3>
              <p className="text-xs text-muted-foreground mt-0.5">CSV templates for standard or shop format</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(
                  'firstName,lastName,phone,email,vehicleYear,vehicleMake,vehicleModel,licensePlate,lastServiceDate,lastServiceMileage\nJohn,Doe,(555) 123-4567,john@example.com,2020,Toyota,Camry,ABC123,2025-01-15,45000',
                  'oilchange-crm-template.csv'
                )}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />Standard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadCSV(
                  'Full Name,Phone,Year/Make/Model,VIN Code,Current Mileage,Repair Description\nJohn Doe,5551234567,2020 Toyota Camry,1HGBH41JXMN109186,45000,Oil Change 5W-30',
                  'shop-format-template.csv'
                )}
                className="gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />Shop Format
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        {parsing ? (
          <p className="text-sm font-medium">Parsing file...</p>
        ) : isDragActive ? (
          <p className="text-sm font-medium">Drop the file here...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop your file here, or click to select
            </p>
            <p className="text-xs text-muted-foreground">
              Supports CSV and Excel (.xlsx) files
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">{error}</p>
      )}

      {parsedFile && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{parsedFile.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {parsedFile.totalRows} rows, {parsedFile.headers.length} columns ({parsedFile.fileType.toUpperCase()})
                </p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <p className="text-xs font-medium p-2 bg-zinc-50 dark:bg-zinc-900 border-b">
                Preview (first 5 rows)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-50/50 dark:bg-zinc-900/50">
                      {parsedFile.headers.map((h, i) => (
                        <th key={i} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedFile.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-t">
                        {parsedFile.headers.map((_, j) => (
                          <td key={j} className="px-2 py-1 truncate max-w-[150px]">
                            {row[j] ?? ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
