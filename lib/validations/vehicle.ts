import { z } from 'zod'

export const createVehicleSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  year: z.number().int().min(1900).max(2100),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  licensePlate: z.string().optional(),
  vin: z.string().optional(),
})

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>
