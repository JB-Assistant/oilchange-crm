import { CustomerStatus } from '@prisma/client'

export const STATUS_COLORS = {
  overdue: {
    bg: 'bg-danger/10',
    text: 'text-danger',
    border: 'border-danger/20',
    label: 'Overdue',
    dot: 'bg-danger'
  },
  due_now: {
    bg: 'bg-warning/10',
    text: 'text-warning',
    border: 'border-warning/20',
    label: 'Due Now',
    dot: 'bg-warning'
  },
  due_soon: {
    bg: 'bg-otto-500/10',
    text: 'text-otto-500',
    border: 'border-otto-500/20',
    label: 'Due Soon',
    dot: 'bg-otto-500'
  },
  up_to_date: {
    bg: 'bg-success/10',
    text: 'text-success',
    border: 'border-success/20',
    label: 'Up to Date',
    dot: 'bg-success'
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
