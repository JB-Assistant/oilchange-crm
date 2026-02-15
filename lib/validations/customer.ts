import { z } from 'zod'

export const createCustomerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  vehicles: z.array(z.object({
    year: z.number().int().min(1900).max(2100),
    make: z.string().min(1),
    model: z.string().min(1),
    licensePlate: z.string().optional(),
  })).default([]),
})

export const updateCustomerSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  smsConsent: z.boolean().optional(),
  preferredContactTime: z.string().optional(),
})

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>
