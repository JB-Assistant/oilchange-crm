export type ImportStep = 'upload' | 'mapping' | 'cleaning' | 'review'

export type SystemField =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'phone'
  | 'email'
  | 'vehicleYear'
  | 'vehicleMake'
  | 'vehicleModel'
  | 'yearMakeModel'
  | 'vin'
  | 'licensePlate'
  | 'lastServiceDate'
  | 'lastServiceMileage'
  | 'repairDescription'
  | 'skip'

export type CleaningStatus = 'clean' | 'fixed' | 'warning' | 'error'

export interface CleaningResult {
  cleaned: string
  original: string
  status: CleaningStatus
  message: string
}

export interface FieldMapping {
  sourceHeader: string
  targetField: SystemField
  confidence: number
  sampleValue: string
}

export interface CleanedCell {
  value: string
  original: string
  status: CleaningStatus
  message: string
  field: SystemField
}

export interface CleanedRow {
  cells: Record<SystemField, CleanedCell>
  rowIndex: number
  hasError: boolean
  hasWarning: boolean
}

export interface ParsedFile {
  headers: string[]
  rows: string[][]
  fileName: string
  fileType: 'csv' | 'xlsx'
  totalRows: number
}

export interface ValidationSummary {
  totalRows: number
  cleanRows: number
  warningRows: number
  errorRows: number
  fixedCells: number
  phonesCleaned: number
  namesSplit: number
  datesNormalized: number
}

export interface DuplicateInfo {
  phone: string
  rowIndex: number
  name: string
  type: 'internal' | 'existing'
}

export interface ImportResultData {
  success: number
  errors: number
  duplicates: number
  message: string
  format?: string
  details?: string[]
}

export interface WizardState {
  step: ImportStep
  parsedFile: ParsedFile | null
  mappings: FieldMapping[]
  cleanedRows: CleanedRow[]
  validationSummary: ValidationSummary | null
  smsConsent: boolean
  importResult: ImportResultData | null
  isImporting: boolean
  existingDuplicates: DuplicateInfo[]
  internalDuplicates: DuplicateInfo[]
}

export type WizardAction =
  | { type: 'SET_PARSED_FILE'; payload: ParsedFile }
  | { type: 'SET_MAPPINGS'; payload: FieldMapping[] }
  | { type: 'UPDATE_MAPPING'; payload: { sourceHeader: string; targetField: SystemField } }
  | { type: 'SET_CLEANED_ROWS'; payload: { rows: CleanedRow[]; summary: ValidationSummary } }
  | { type: 'UPDATE_CELL'; payload: { rowIndex: number; field: SystemField; cell: CleanedCell } }
  | { type: 'SET_SMS_CONSENT'; payload: boolean }
  | { type: 'SET_STEP'; payload: ImportStep }
  | { type: 'SET_IMPORTING'; payload: boolean }
  | { type: 'SET_IMPORT_RESULT'; payload: ImportResultData }
  | { type: 'SET_DUPLICATES'; payload: { existing: DuplicateInfo[]; internal: DuplicateInfo[] } }
  | { type: 'RESET' }
