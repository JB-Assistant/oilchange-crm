import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import type { ParsedFile } from './types'

export function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file)
  }
  return parseCSV(file)
}

function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete(results) {
        const data = results.data as string[][]
        const filtered = data.filter(row => row.some(cell => cell.trim()))

        if (filtered.length < 2) {
          reject(new Error('File is empty or has no data rows'))
          return
        }

        resolve({
          headers: filtered[0].map(h => h.trim()),
          rows: filtered.slice(1),
          fileName: file.name,
          fileType: 'csv',
          totalRows: filtered.length - 1,
        })
      },
      error(err) {
        reject(new Error(`CSV parse error: ${err.message}`))
      },
    })
  })
}

async function parseExcel(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error('Excel file has no sheets')
  }

  const sheet = workbook.Sheets[sheetName]
  const data: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    rawNumbers: false,
  })

  const filtered = data.filter(row => row.some(cell => String(cell).trim()))

  if (filtered.length < 2) {
    throw new Error('Excel file is empty or has no data rows')
  }

  return {
    headers: filtered[0].map(h => String(h).trim()),
    rows: filtered.slice(1).map(row => row.map(cell => String(cell))),
    fileName: file.name,
    fileType: 'xlsx',
    totalRows: filtered.length - 1,
  }
}
