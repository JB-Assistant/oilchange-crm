import { CustomerStatus } from '@prisma/client'

export const STATUS_COLORS = {
  overdue: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-200',
    label: 'Overdue',
    dot: 'bg-red-500'
  },
  due_now: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-200',
    label: 'Due Now',
    dot: 'bg-orange-500'
  },
  due_soon: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    label: 'Due Soon',
    dot: 'bg-yellow-500'
  },
  up_to_date: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-200',
    label: 'Up to Date',
    dot: 'bg-green-500'
  }
} as const

export const getStatusColor = (status: CustomerStatus) => {
  return STATUS_COLORS[status] || STATUS_COLORS.up_to_date
}

export const getStatusFromDueDate = (nextDueDate: Date, nextDueMileage: number, currentMileage: number): CustomerStatus => {
  const now = new Date()
  const dueDate = new Date(nextDueDate)
  
  // Check if overdue (past due date or exceeded mileage)
  if (dueDate < now || currentMileage >= nextDueMileage) {
    return CustomerStatus.overdue
  }
  
  // Check if due now (within 7 days or within 500 miles)
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  if (dueDate <= sevenDaysFromNow || (nextDueMileage - currentMileage) <= 500) {
    return CustomerStatus.due_now
  }
  
  // Check if due soon (within 30 days or within 1000 miles)
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (dueDate <= thirtyDaysFromNow || (nextDueMileage - currentMileage) <= 1000) {
    return CustomerStatus.due_soon
  }
  
  return CustomerStatus.up_to_date
}

// Calculate next due date (3 months from service date)
export const calculateNextDueDate = (serviceDate: Date): Date => {
  const nextDue = new Date(serviceDate)
  nextDue.setMonth(nextDue.getMonth() + 3)
  return nextDue
}

// Calculate next due mileage (5000 miles from service mileage)
export const calculateNextDueMileage = (mileageAtService: number): number => {
  return mileageAtService + 5000
}
