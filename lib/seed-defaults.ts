import { prisma } from './prisma'
import { DEFAULT_TEMPLATES } from './template-engine'

const DEFAULT_SERVICE_TYPES = [
  {
    name: 'oil_change_conventional',
    displayName: 'Oil Change (Conventional)',
    defaultMileageInterval: 5000,
    defaultTimeIntervalDays: 90,
    reminderLeadDays: 14,
  },
  {
    name: 'oil_change_synthetic',
    displayName: 'Oil Change (Synthetic)',
    defaultMileageInterval: 7500,
    defaultTimeIntervalDays: 180,
    reminderLeadDays: 14,
  },
  {
    name: 'tire_rotation',
    displayName: 'Tire Rotation',
    defaultMileageInterval: 7500,
    defaultTimeIntervalDays: 180,
    reminderLeadDays: 14,
  },
  {
    name: 'state_inspection',
    displayName: 'State Inspection',
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 30,
  },
] as const

const TEMPLATE_DEFS = [
  { name: 'First Reminder', body: DEFAULT_TEMPLATES.firstReminder },
  { name: 'Due Date', body: DEFAULT_TEMPLATES.dueDateReminder },
  { name: 'Overdue', body: DEFAULT_TEMPLATES.overdueReminder },
] as const

// Sequence definitions: [sequenceNumber, offsetDays, templateIndex]
const RULE_SEQUENCES: [number, number, number][] = [
  [1, -14, 0], // First reminder: 14 days before
  [2, 0, 1],   // Due date: on the day
  [3, 7, 2],   // Overdue: 7 days after
]

async function ensureServiceTypes(orgId: string) {
  const count = await prisma.serviceType.count({ where: { orgId } })
  if (count > 0) return prisma.serviceType.findMany({ where: { orgId } })

  return Promise.all(
    DEFAULT_SERVICE_TYPES.map((st) =>
      prisma.serviceType.create({
        data: {
          orgId,
          name: st.name,
          displayName: st.displayName,
          defaultMileageInterval: st.defaultMileageInterval,
          defaultTimeIntervalDays: st.defaultTimeIntervalDays,
          reminderLeadDays: st.reminderLeadDays,
          isCustom: false,
        },
      })
    )
  )
}

async function ensureTemplates(orgId: string) {
  const count = await prisma.reminderTemplate.count({ where: { orgId } })
  if (count > 0) return prisma.reminderTemplate.findMany({ where: { orgId } })

  return Promise.all(
    TEMPLATE_DEFS.map((t) =>
      prisma.reminderTemplate.create({
        data: {
          orgId,
          name: t.name,
          body: t.body,
          isDefault: true,
        },
      })
    )
  )
}

async function ensureReminderRules(
  orgId: string,
  serviceTypes: { id: string }[],
  templates: { id: string }[]
) {
  const count = await prisma.reminderRule.count({ where: { orgId } })
  if (count > 0) return

  const rules = serviceTypes.flatMap((st) =>
    RULE_SEQUENCES.map(([seq, offset, tplIdx]) => ({
      orgId,
      serviceTypeId: st.id,
      sequenceNumber: seq,
      offsetDays: offset,
      templateId: templates[tplIdx]?.id ?? null,
    }))
  )

  await prisma.reminderRule.createMany({ data: rules })
}

export async function seedOrgDefaults(orgId: string) {
  const serviceTypes = await ensureServiceTypes(orgId)
  const templates = await ensureTemplates(orgId)
  await ensureReminderRules(orgId, serviceTypes, templates)
}
