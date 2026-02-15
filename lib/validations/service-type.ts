import { z } from 'zod'

export const createServiceTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  displayName: z.string().min(1, 'Display name is required').max(200),
  defaultMileageInterval: z.number().int().min(0).nullable().optional(),
  defaultTimeIntervalDays: z.number().int().min(1).nullable().optional(),
  reminderLeadDays: z.number().int().min(1).default(14),
  category: z.string().optional(),
  description: z.string().optional(),
})

export type CreateServiceTypeInput = z.infer<typeof createServiceTypeSchema>
