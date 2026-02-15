import { z } from 'zod'

export const sendSmsSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  body: z.string().min(1, 'Message body is required').max(1600),
  vehicleId: z.string().optional(),
  serviceRecordId: z.string().optional(),
})

export type SendSmsInput = z.infer<typeof sendSmsSchema>
