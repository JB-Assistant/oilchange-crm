import type { SystemField, FieldMapping } from './types'

interface AliasEntry {
  field: SystemField
  aliases: string[]
}

const FIELD_ALIASES: AliasEntry[] = [
  {
    field: 'phone',
    aliases: [
      'phone', 'phone number', 'telephone', 'mobile', 'cell', 'main phone',
      'contact number', 'phone#', 'cell phone', 'mobile phone', 'tel',
    ],
  },
  {
    field: 'firstName',
    aliases: [
      'first name', 'firstname', 'fname', 'given name', 'first',
    ],
  },
  {
    field: 'lastName',
    aliases: [
      'last name', 'lastname', 'lname', 'surname', 'family name', 'last',
    ],
  },
  {
    field: 'fullName',
    aliases: [
      'full name', 'fullname', 'customer name', 'name', 'display name',
      'customer', 'contact name', 'client name', 'client',
    ],
  },
  {
    field: 'email',
    aliases: [
      'email', 'email address', 'e-mail', 'emailaddress', 'main email',
    ],
  },
  {
    field: 'vehicleYear',
    aliases: [
      'vehicle year', 'vehicleyear', 'year', 'car year', 'auto year',
    ],
  },
  {
    field: 'vehicleMake',
    aliases: [
      'vehicle make', 'vehiclemake', 'make', 'car make', 'manufacturer',
    ],
  },
  {
    field: 'vehicleModel',
    aliases: [
      'vehicle model', 'vehiclemodel', 'model', 'car model',
    ],
  },
  {
    field: 'yearMakeModel',
    aliases: [
      'year/make/model', 'yearmakemodel', 'ymm', 'vehicle',
      'year make model', 'vehicle info',
    ],
  },
  {
    field: 'vin',
    aliases: [
      'vin', 'vin code', 'vin number', 'vehicle identification number',
      'vin#', 'vincode',
    ],
  },
  {
    field: 'licensePlate',
    aliases: [
      'license plate', 'licenseplate', 'plate', 'plate number', 'tag',
      'license', 'plate#', 'tag number',
    ],
  },
  {
    field: 'lastServiceDate',
    aliases: [
      'last service date', 'lastservicedate', 'service date', 'last visit',
      'date of service', 'last service', 'dos', 'date',
    ],
  },
  {
    field: 'lastServiceMileage',
    aliases: [
      'last service mileage', 'lastservicemileage', 'mileage', 'current mileage',
      'current milleage', 'odometer', 'miles', 'mileage at service',
      'service mileage',
    ],
  },
  {
    field: 'repairDescription',
    aliases: [
      'repair description', 'service description', 'description', 'repair',
      'service type', 'service performed', 'work performed', 'notes',
      'service notes',
    ],
  },
]

function scoreMatch(header: string, alias: string): number {
  const h = header.toLowerCase().trim()
  const a = alias.toLowerCase()

  if (h === a) return 100
  if (h.replace(/[^a-z0-9]/g, '') === a.replace(/[^a-z0-9]/g, '')) return 95
  if (h.startsWith(a) || a.startsWith(h)) return 40
  if (h.includes(a) || a.includes(h)) return 60
  return 0
}

function scoreByData(values: string[], field: SystemField): number {
  const sampleSize = Math.min(values.length, 10)
  const sample = values.slice(0, sampleSize).filter(v => v.trim())
  if (sample.length === 0) return 0

  switch (field) {
    case 'phone': {
      const phoneMatches = sample.filter(v => {
        const digits = v.replace(/\D/g, '')
        return digits.length >= 10 && digits.length <= 11
      })
      return phoneMatches.length >= sampleSize * 0.6 ? 30 : 0
    }
    case 'email': {
      const emailMatches = sample.filter(v => v.includes('@'))
      return emailMatches.length >= sampleSize * 0.5 ? 30 : 0
    }
    case 'vehicleYear': {
      const yearMatches = sample.filter(v => {
        const n = parseInt(v)
        return !isNaN(n) && n >= 1970 && n <= 2100 && v.trim().length === 4
      })
      return yearMatches.length >= sampleSize * 0.5 ? 25 : 0
    }
    case 'lastServiceMileage': {
      const numMatches = sample.filter(v => {
        const n = parseInt(v.replace(/[,\s]/g, ''))
        return !isNaN(n) && n >= 100 && n <= 500000
      })
      return numMatches.length >= sampleSize * 0.5 ? 20 : 0
    }
    case 'vin': {
      const vinMatches = sample.filter(v => v.replace(/\s/g, '').length === 17)
      return vinMatches.length >= sampleSize * 0.4 ? 25 : 0
    }
    default:
      return 0
  }
}

export function autoDetectMappings(
  headers: string[],
  rows: string[][]
): FieldMapping[] {
  const candidates: { header: string; field: SystemField; score: number; sample: string }[] = []

  for (const header of headers) {
    const columnValues = rows.map(row => row[headers.indexOf(header)] ?? '')
    const sampleValue = columnValues.find(v => v.trim()) ?? ''

    for (const entry of FIELD_ALIASES) {
      let bestAliasScore = 0
      for (const alias of entry.aliases) {
        const s = scoreMatch(header, alias)
        bestAliasScore = Math.max(bestAliasScore, s)
      }

      const dataScore = scoreByData(columnValues, entry.field)
      const totalScore = bestAliasScore + dataScore

      if (totalScore > 0) {
        candidates.push({ header, field: entry.field, score: totalScore, sample: sampleValue })
      }
    }
  }

  // Sort by score descending, then greedily assign
  candidates.sort((a, b) => b.score - a.score)

  const assignedHeaders = new Set<string>()
  const assignedFields = new Set<SystemField>()
  const mappings: FieldMapping[] = []

  for (const c of candidates) {
    if (assignedHeaders.has(c.header) || assignedFields.has(c.field)) continue
    if (c.score < 20) continue

    mappings.push({
      sourceHeader: c.header,
      targetField: c.field,
      confidence: Math.min(c.score, 100),
      sampleValue: c.sample,
    })
    assignedHeaders.add(c.header)
    assignedFields.add(c.field)
  }

  // Add unmapped headers as "skip"
  for (const header of headers) {
    if (!assignedHeaders.has(header)) {
      const columnValues = rows.map(row => row[headers.indexOf(header)] ?? '')
      mappings.push({
        sourceHeader: header,
        targetField: 'skip',
        confidence: 0,
        sampleValue: columnValues.find(v => v.trim()) ?? '',
      })
    }
  }

  return mappings
}

export const SYSTEM_FIELD_LABELS: Record<SystemField, string> = {
  firstName: 'First Name',
  lastName: 'Last Name',
  fullName: 'Full Name',
  phone: 'Phone',
  email: 'Email',
  vehicleYear: 'Vehicle Year',
  vehicleMake: 'Vehicle Make',
  vehicleModel: 'Vehicle Model',
  yearMakeModel: 'Year/Make/Model',
  vin: 'VIN',
  licensePlate: 'License Plate',
  lastServiceDate: 'Last Service Date',
  lastServiceMileage: 'Last Service Mileage',
  repairDescription: 'Repair Description',
  skip: 'Skip',
}

export const ALL_SYSTEM_FIELDS: SystemField[] = [
  'firstName', 'lastName', 'fullName', 'phone', 'email',
  'vehicleYear', 'vehicleMake', 'vehicleModel', 'yearMakeModel',
  'vin', 'licensePlate', 'lastServiceDate', 'lastServiceMileage',
  'repairDescription', 'skip',
]
