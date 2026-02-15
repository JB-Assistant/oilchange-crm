import { z } from 'zod'

export const createFollowUpSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  serviceRecordId: z.string().min(1, 'Service record ID is required'),
  method: z.enum(['call', 'text', 'email']),
  outcome: z.enum([
    'scheduled',
    'not_interested',
    'no_response',
    'serviced_elsewhere',
    'left_message',
    'wrong_number',
  ]),
  notes: z.string().optional(),
  staffMember: z.string().optional(),
})

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>
