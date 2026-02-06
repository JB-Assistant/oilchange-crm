import { CustomerStatus, ContactMethod, FollowUpOutcome } from '@prisma/client'

export interface CustomerWithVehicles {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  status: CustomerStatus
  createdAt: Date
  updatedAt: Date
  vehicles: VehicleWithServiceRecords[]
}

export interface VehicleWithServiceRecords {
  id: string
  customerId: string
  year: number
  make: string
  model: string
  licensePlate: string | null
  mileageAtLastService: number | null
  serviceRecords: ServiceRecord[]
}

export interface ServiceRecord {
  id: string
  vehicleId: string
  serviceDate: Date
  mileageAtService: number
  serviceType: string
  notes: string | null
  nextDueDate: Date
  nextDueMileage: number
  createdAt: Date
}

export interface FollowUpRecord {
  id: string
  customerId: string
  serviceRecordId: string
  contactDate: Date
  method: ContactMethod
  outcome: FollowUpOutcome
  notes: string | null
  staffMember: string | null
  createdAt: Date
}

export interface DashboardStats {
  totalCustomers: number
  overdue: number
  dueNow: number
  dueSoon: number
  upToDate: number
  recentFollowUps: number
  conversionRate: number
}

export interface CSVCustomerRow {
  firstName: string
  lastName: string
  phone: string
  email?: string
  vehicleYear?: number
  vehicleMake?: string
  vehicleModel?: string
  licensePlate?: string
  lastServiceDate?: string
  lastServiceMileage?: number
}
