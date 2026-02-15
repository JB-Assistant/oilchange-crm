import { prisma } from './prisma'
import { DEFAULT_TEMPLATES } from './template-engine'

interface ServiceTypeDefault {
  name: string
  displayName: string
  category: string
  description: string
  sortOrder: number
  defaultMileageInterval: number | null
  defaultTimeIntervalDays: number | null
  reminderLeadDays: number
}

const DEFAULT_SERVICE_TYPES: ServiceTypeDefault[] = [
  // Oil Change category
  {
    name: 'oil_change_standard',
    displayName: 'Oil Change (Standard)',
    category: 'oil_change',
    description: 'Conventional oil change with standard filter',
    sortOrder: 0,
    defaultMileageInterval: 5000,
    defaultTimeIntervalDays: 90,
    reminderLeadDays: 14,
  },
  {
    name: 'oil_change_synthetic',
    displayName: 'Oil Change (Synthetic)',
    category: 'oil_change',
    description: 'Full synthetic oil change with premium filter',
    sortOrder: 1,
    defaultMileageInterval: 7500,
    defaultTimeIntervalDays: 180,
    reminderLeadDays: 14,
  },
  {
    name: 'oil_change_severe',
    displayName: 'Oil Change (Severe Duty)',
    category: 'oil_change',
    description: 'For vehicles under severe driving conditions',
    sortOrder: 2,
    defaultMileageInterval: 3000,
    defaultTimeIntervalDays: 90,
    reminderLeadDays: 14,
  },
  // Tires category
  {
    name: 'tire_rotation_standard',
    displayName: 'Tire Rotation',
    category: 'tires',
    description: 'Standard tire rotation for even wear',
    sortOrder: 0,
    defaultMileageInterval: 7500,
    defaultTimeIntervalDays: 180,
    reminderLeadDays: 14,
  },
  {
    name: 'tire_rotation_performance',
    displayName: 'Tire Rotation (Performance)',
    category: 'tires',
    description: 'Performance tire rotation with inspection',
    sortOrder: 1,
    defaultMileageInterval: 5000,
    defaultTimeIntervalDays: 120,
    reminderLeadDays: 14,
  },
  // Brakes category
  {
    name: 'brake_pad_inspection',
    displayName: 'Brake Pad Inspection',
    category: 'brakes',
    description: 'Visual brake pad thickness and wear inspection',
    sortOrder: 0,
    defaultMileageInterval: 15000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  {
    name: 'brake_fluid_flush',
    displayName: 'Brake Fluid Flush',
    category: 'brakes',
    description: 'Complete brake fluid replacement',
    sortOrder: 1,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 30,
  },
  {
    name: 'brake_pad_replacement',
    displayName: 'Brake Pad Replacement',
    category: 'brakes',
    description: 'Replace worn brake pads',
    sortOrder: 2,
    defaultMileageInterval: 25000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  // Transmission category
  {
    name: 'transmission_fluid_check',
    displayName: 'Transmission Fluid Check',
    category: 'transmission',
    description: 'Check transmission fluid level and condition',
    sortOrder: 0,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  {
    name: 'transmission_fluid_change',
    displayName: 'Transmission Fluid Change',
    category: 'transmission',
    description: 'Full transmission fluid replacement',
    sortOrder: 1,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 30,
  },
  // Cooling category
  {
    name: 'coolant_flush',
    displayName: 'Coolant Flush',
    category: 'cooling',
    description: 'Complete coolant system flush and refill',
    sortOrder: 0,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 30,
  },
  {
    name: 'coolant_topoff',
    displayName: 'Coolant Top-Off',
    category: 'cooling',
    description: 'Top off coolant to proper level',
    sortOrder: 1,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  // Electrical category
  {
    name: 'battery_test',
    displayName: 'Battery Test',
    category: 'electrical',
    description: 'Load test and terminal inspection',
    sortOrder: 0,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  {
    name: 'battery_replacement',
    displayName: 'Battery Replacement',
    category: 'electrical',
    description: 'Replace vehicle battery',
    sortOrder: 1,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 1460,
    reminderLeadDays: 30,
  },
  // Filters category
  {
    name: 'engine_air_filter',
    displayName: 'Engine Air Filter',
    category: 'filters',
    description: 'Replace engine air filter',
    sortOrder: 0,
    defaultMileageInterval: 15000,
    defaultTimeIntervalDays: 545,
    reminderLeadDays: 14,
  },
  {
    name: 'cabin_air_filter',
    displayName: 'Cabin Air Filter',
    category: 'filters',
    description: 'Replace cabin air filter',
    sortOrder: 1,
    defaultMileageInterval: 12000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  // Wipers category
  {
    name: 'wiper_blades',
    displayName: 'Wiper Blades',
    category: 'wipers',
    description: 'Replace windshield wiper blades',
    sortOrder: 0,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 270,
    reminderLeadDays: 14,
  },
  // Fluids category
  {
    name: 'power_steering_fluid',
    displayName: 'Power Steering Fluid',
    category: 'fluids',
    description: 'Check and replace power steering fluid',
    sortOrder: 0,
    defaultMileageInterval: 50000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  // Inspection category
  {
    name: 'state_inspection',
    displayName: 'State Inspection',
    category: 'inspection',
    description: 'Annual state vehicle inspection',
    sortOrder: 0,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 30,
  },
  // Alignment category
  {
    name: 'wheel_alignment_check',
    displayName: 'Wheel Alignment Check',
    category: 'alignment',
    description: 'Check and adjust wheel alignment angles',
    sortOrder: 0,
    defaultMileageInterval: 12000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  {
    name: 'wheel_alignment_full',
    displayName: 'Full Wheel Alignment',
    category: 'alignment',
    description: 'Complete four-wheel alignment service',
    sortOrder: 1,
    defaultMileageInterval: 24000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 14,
  },
  // Engine category
  {
    name: 'spark_plug_replacement',
    displayName: 'Spark Plug Replacement',
    category: 'engine',
    description: 'Replace spark plugs for optimal ignition',
    sortOrder: 0,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  {
    name: 'engine_tune_up',
    displayName: 'Engine Tune-Up',
    category: 'engine',
    description: 'Comprehensive engine tune-up service',
    sortOrder: 1,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 14,
  },
  // Belts category
  {
    name: 'timing_belt_inspection',
    displayName: 'Timing Belt Inspection',
    category: 'belts',
    description: 'Inspect timing belt condition and tension',
    sortOrder: 0,
    defaultMileageInterval: 50000,
    defaultTimeIntervalDays: 1825,
    reminderLeadDays: 30,
  },
  {
    name: 'timing_belt_replacement',
    displayName: 'Timing Belt Replacement',
    category: 'belts',
    description: 'Replace timing belt to prevent engine damage',
    sortOrder: 1,
    defaultMileageInterval: 60000,
    defaultTimeIntervalDays: 2190,
    reminderLeadDays: 30,
  },
  {
    name: 'serpentine_belt',
    displayName: 'Serpentine Belt',
    category: 'belts',
    description: 'Inspect and replace serpentine/drive belt',
    sortOrder: 2,
    defaultMileageInterval: 60000,
    defaultTimeIntervalDays: 1460,
    reminderLeadDays: 14,
  },
  // Fuel system category
  {
    name: 'fuel_filter',
    displayName: 'Fuel Filter Replacement',
    category: 'fuel_system',
    description: 'Replace fuel filter for clean fuel delivery',
    sortOrder: 0,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  {
    name: 'fuel_injection_cleaning',
    displayName: 'Fuel Injection Cleaning',
    category: 'fuel_system',
    description: 'Clean fuel injectors and throttle body',
    sortOrder: 1,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  // Drivetrain category
  {
    name: 'differential_fluid',
    displayName: 'Differential Fluid Service',
    category: 'drivetrain',
    description: 'Replace differential fluid (front/rear)',
    sortOrder: 0,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  {
    name: 'transfer_case_fluid',
    displayName: 'Transfer Case Fluid',
    category: 'drivetrain',
    description: 'Replace transfer case fluid (4WD/AWD vehicles)',
    sortOrder: 1,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  // AC category
  {
    name: 'ac_recharge',
    displayName: 'AC Recharge',
    category: 'ac',
    description: 'Recharge vehicle AC refrigerant',
    sortOrder: 0,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 30,
  },
  {
    name: 'ac_system_inspection',
    displayName: 'AC System Inspection',
    category: 'ac',
    description: 'Full AC system performance check',
    sortOrder: 1,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
  },
  // Exhaust category
  {
    name: 'exhaust_inspection',
    displayName: 'Exhaust System Inspection',
    category: 'exhaust',
    description: 'Inspect exhaust system for leaks and damage',
    sortOrder: 0,
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 14,
  },
  // Suspension category
  {
    name: 'suspension_inspection',
    displayName: 'Suspension Inspection',
    category: 'suspension',
    description: 'Inspect shocks, struts, and suspension components',
    sortOrder: 0,
    defaultMileageInterval: 50000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  {
    name: 'shock_strut_replacement',
    displayName: 'Shock/Strut Replacement',
    category: 'suspension',
    description: 'Replace worn shocks or struts',
    sortOrder: 1,
    defaultMileageInterval: 50000,
    defaultTimeIntervalDays: null,
    reminderLeadDays: 14,
  },
  // Emissions category
  {
    name: 'emissions_test',
    displayName: 'Emissions / Smog Test',
    category: 'emissions',
    description: 'State emissions or smog test',
    sortOrder: 0,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 30,
  },
  // Lighting category
  {
    name: 'headlight_restoration',
    displayName: 'Headlight Restoration',
    category: 'lighting',
    description: 'Restore cloudy/yellowed headlight lenses',
    sortOrder: 0,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 14,
  },
  {
    name: 'bulb_replacement',
    displayName: 'Headlight/Bulb Replacement',
    category: 'lighting',
    description: 'Replace headlight, taillight, or signal bulbs',
    sortOrder: 1,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 14,
  },
  // Radiator category
  {
    name: 'radiator_hose_inspection',
    displayName: 'Radiator Hose Inspection',
    category: 'cooling',
    description: 'Inspect radiator hoses for cracks, bulges, and leaks',
    sortOrder: 2,
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 14,
  },
]

const TEMPLATE_DEFS = [
  { name: 'Two Weeks Before', body: DEFAULT_TEMPLATES.twoWeeksBefore },
  { name: 'One Week Before', body: DEFAULT_TEMPLATES.oneWeekBefore },
  { name: 'Due Date', body: DEFAULT_TEMPLATES.dueDateReminder },
  { name: 'One Week Overdue', body: DEFAULT_TEMPLATES.oneWeekOverdue },
  { name: 'Two Weeks Overdue', body: DEFAULT_TEMPLATES.twoWeeksOverdue },
] as const

// Sequence definitions: [sequenceNumber, offsetDays, templateIndex]
const RULE_SEQUENCES: [number, number, number][] = [
  [1, -14, 0], // Two weeks before
  [2, -7, 1],  // One week before
  [3, 0, 2],   // Due date
  [4, 7, 3],   // One week overdue
  [5, 14, 4],  // Two weeks overdue
]

/** Category display names for UI grouping */
export const SERVICE_CATEGORIES: Record<string, string> = {
  oil_change: 'Oil Change',
  tires: 'Tires',
  brakes: 'Brakes',
  transmission: 'Transmission',
  cooling: 'Cooling System',
  electrical: 'Electrical',
  filters: 'Filters',
  wipers: 'Wipers',
  fluids: 'Fluids',
  inspection: 'Inspection',
  alignment: 'Wheel Alignment',
  engine: 'Engine',
  belts: 'Belts & Timing',
  fuel_system: 'Fuel System',
  drivetrain: 'Drivetrain',
  ac: 'AC / Climate',
  exhaust: 'Exhaust',
  suspension: 'Suspension',
  emissions: 'Emissions',
  lighting: 'Lighting',
  general: 'General',
}

async function ensureServiceTypes(orgId: string) {
  const existing = await prisma.serviceType.findMany({
    where: { orgId },
    select: { name: true },
  })
  const existingNames = new Set(existing.map((st) => st.name))

  const missing = DEFAULT_SERVICE_TYPES.filter(
    (st) => !existingNames.has(st.name)
  )

  if (missing.length > 0) {
    await prisma.serviceType.createMany({
      data: missing.map((st) => ({
        orgId,
        name: st.name,
        displayName: st.displayName,
        category: st.category,
        description: st.description,
        sortOrder: st.sortOrder,
        defaultMileageInterval: st.defaultMileageInterval,
        defaultTimeIntervalDays: st.defaultTimeIntervalDays,
        reminderLeadDays: st.reminderLeadDays,
        isCustom: false,
      })),
    })
  }

  return prisma.serviceType.findMany({ where: { orgId } })
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
