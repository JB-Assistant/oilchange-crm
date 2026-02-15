import { z } from 'zod'

export const createServiceRecordSchema = z.object({
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  serviceDate: z.string().min(1, 'Service date is required'),
  mileageAtService: z.number().int().min(0, 'Mileage must be positive'),
  serviceType: z.string().min(1, 'Service type is required'),
  notes: z.string().optional(),
})

export type CreateServiceRecordInput = z.infer<typeof createServiceRecordSchema>
