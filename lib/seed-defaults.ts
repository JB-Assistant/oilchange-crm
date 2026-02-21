import { createProductAdminClient } from '@/lib/supabase/server'
import { DEFAULT_TEMPLATES } from './template-engine'

interface ServiceTypeDefault {
  name: string
  display_name: string
  category: string
  description: string
  sort_order: number
  default_mileage_interval: number | null
  default_time_interval_days: number | null
  reminder_lead_days: number
}

const DEFAULT_SERVICE_TYPES: ServiceTypeDefault[] = [
  { name: 'oil_change_standard', display_name: 'Oil Change (Standard)', category: 'oil_change', description: 'Conventional oil change with standard filter', sort_order: 0, default_mileage_interval: 5000, default_time_interval_days: 90, reminder_lead_days: 14 },
  { name: 'oil_change_synthetic', display_name: 'Oil Change (Synthetic)', category: 'oil_change', description: 'Full synthetic oil change with premium filter', sort_order: 1, default_mileage_interval: 7500, default_time_interval_days: 180, reminder_lead_days: 14 },
  { name: 'oil_change_severe', display_name: 'Oil Change (Severe Duty)', category: 'oil_change', description: 'For vehicles under severe driving conditions', sort_order: 2, default_mileage_interval: 3000, default_time_interval_days: 90, reminder_lead_days: 14 },
  { name: 'tire_rotation_standard', display_name: 'Tire Rotation', category: 'tires', description: 'Standard tire rotation for even wear', sort_order: 0, default_mileage_interval: 7500, default_time_interval_days: 180, reminder_lead_days: 14 },
  { name: 'tire_rotation_performance', display_name: 'Tire Rotation (Performance)', category: 'tires', description: 'Performance tire rotation with inspection', sort_order: 1, default_mileage_interval: 5000, default_time_interval_days: 120, reminder_lead_days: 14 },
  { name: 'brake_pad_inspection', display_name: 'Brake Pad Inspection', category: 'brakes', description: 'Visual brake pad thickness and wear inspection', sort_order: 0, default_mileage_interval: 15000, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'brake_fluid_flush', display_name: 'Brake Fluid Flush', category: 'brakes', description: 'Complete brake fluid replacement', sort_order: 1, default_mileage_interval: 30000, default_time_interval_days: 730, reminder_lead_days: 30 },
  { name: 'brake_pad_replacement', display_name: 'Brake Pad Replacement', category: 'brakes', description: 'Replace worn brake pads', sort_order: 2, default_mileage_interval: 25000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'transmission_fluid_check', display_name: 'Transmission Fluid Check', category: 'transmission', description: 'Check transmission fluid level and condition', sort_order: 0, default_mileage_interval: 30000, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'transmission_fluid_change', display_name: 'Transmission Fluid Change', category: 'transmission', description: 'Full transmission fluid replacement', sort_order: 1, default_mileage_interval: 30000, default_time_interval_days: 730, reminder_lead_days: 30 },
  { name: 'coolant_flush', display_name: 'Coolant Flush', category: 'cooling', description: 'Complete coolant system flush and refill', sort_order: 0, default_mileage_interval: 30000, default_time_interval_days: 730, reminder_lead_days: 30 },
  { name: 'coolant_topoff', display_name: 'Coolant Top-Off', category: 'cooling', description: 'Top off coolant to proper level', sort_order: 1, default_mileage_interval: null, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'battery_test', display_name: 'Battery Test', category: 'electrical', description: 'Load test and terminal inspection', sort_order: 0, default_mileage_interval: null, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'battery_replacement', display_name: 'Battery Replacement', category: 'electrical', description: 'Replace vehicle battery', sort_order: 1, default_mileage_interval: null, default_time_interval_days: 1460, reminder_lead_days: 30 },
  { name: 'engine_air_filter', display_name: 'Engine Air Filter', category: 'filters', description: 'Replace engine air filter', sort_order: 0, default_mileage_interval: 15000, default_time_interval_days: 545, reminder_lead_days: 14 },
  { name: 'cabin_air_filter', display_name: 'Cabin Air Filter', category: 'filters', description: 'Replace cabin air filter', sort_order: 1, default_mileage_interval: 12000, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'wiper_blades', display_name: 'Wiper Blades', category: 'wipers', description: 'Replace windshield wiper blades', sort_order: 0, default_mileage_interval: null, default_time_interval_days: 270, reminder_lead_days: 14 },
  { name: 'power_steering_fluid', display_name: 'Power Steering Fluid', category: 'fluids', description: 'Check and replace power steering fluid', sort_order: 0, default_mileage_interval: 50000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'state_inspection', display_name: 'State Inspection', category: 'inspection', description: 'Annual state vehicle inspection', sort_order: 0, default_mileage_interval: null, default_time_interval_days: 365, reminder_lead_days: 30 },
  { name: 'wheel_alignment_check', display_name: 'Wheel Alignment Check', category: 'alignment', description: 'Check and adjust wheel alignment angles', sort_order: 0, default_mileage_interval: 12000, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'wheel_alignment_full', display_name: 'Full Wheel Alignment', category: 'alignment', description: 'Complete four-wheel alignment service', sort_order: 1, default_mileage_interval: 24000, default_time_interval_days: 730, reminder_lead_days: 14 },
  { name: 'spark_plug_replacement', display_name: 'Spark Plug Replacement', category: 'engine', description: 'Replace spark plugs for optimal ignition', sort_order: 0, default_mileage_interval: 30000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'engine_tune_up', display_name: 'Engine Tune-Up', category: 'engine', description: 'Comprehensive engine tune-up service', sort_order: 1, default_mileage_interval: 30000, default_time_interval_days: 730, reminder_lead_days: 14 },
  { name: 'timing_belt_inspection', display_name: 'Timing Belt Inspection', category: 'belts', description: 'Inspect timing belt condition and tension', sort_order: 0, default_mileage_interval: 50000, default_time_interval_days: 1825, reminder_lead_days: 30 },
  { name: 'timing_belt_replacement', display_name: 'Timing Belt Replacement', category: 'belts', description: 'Replace timing belt to prevent engine damage', sort_order: 1, default_mileage_interval: 60000, default_time_interval_days: 2190, reminder_lead_days: 30 },
  { name: 'serpentine_belt', display_name: 'Serpentine Belt', category: 'belts', description: 'Inspect and replace serpentine/drive belt', sort_order: 2, default_mileage_interval: 60000, default_time_interval_days: 1460, reminder_lead_days: 14 },
  { name: 'fuel_filter', display_name: 'Fuel Filter Replacement', category: 'fuel_system', description: 'Replace fuel filter for clean fuel delivery', sort_order: 0, default_mileage_interval: 30000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'fuel_injection_cleaning', display_name: 'Fuel Injection Cleaning', category: 'fuel_system', description: 'Clean fuel injectors and throttle body', sort_order: 1, default_mileage_interval: 30000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'differential_fluid', display_name: 'Differential Fluid Service', category: 'drivetrain', description: 'Replace differential fluid (front/rear)', sort_order: 0, default_mileage_interval: 30000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'transfer_case_fluid', display_name: 'Transfer Case Fluid', category: 'drivetrain', description: 'Replace transfer case fluid (4WD/AWD vehicles)', sort_order: 1, default_mileage_interval: 30000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'ac_recharge', display_name: 'AC Recharge', category: 'ac', description: 'Recharge vehicle AC refrigerant', sort_order: 0, default_mileage_interval: null, default_time_interval_days: 730, reminder_lead_days: 30 },
  { name: 'ac_system_inspection', display_name: 'AC System Inspection', category: 'ac', description: 'Full AC system performance check', sort_order: 1, default_mileage_interval: null, default_time_interval_days: 365, reminder_lead_days: 14 },
  { name: 'exhaust_inspection', display_name: 'Exhaust System Inspection', category: 'exhaust', description: 'Inspect exhaust system for leaks and damage', sort_order: 0, default_mileage_interval: 30000, default_time_interval_days: 730, reminder_lead_days: 14 },
  { name: 'suspension_inspection', display_name: 'Suspension Inspection', category: 'suspension', description: 'Inspect shocks, struts, and suspension components', sort_order: 0, default_mileage_interval: 50000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'shock_strut_replacement', display_name: 'Shock/Strut Replacement', category: 'suspension', description: 'Replace worn shocks or struts', sort_order: 1, default_mileage_interval: 50000, default_time_interval_days: null, reminder_lead_days: 14 },
  { name: 'emissions_test', display_name: 'Emissions / Smog Test', category: 'emissions', description: 'State emissions or smog test', sort_order: 0, default_mileage_interval: null, default_time_interval_days: 365, reminder_lead_days: 30 },
  { name: 'headlight_restoration', display_name: 'Headlight Restoration', category: 'lighting', description: 'Restore cloudy/yellowed headlight lenses', sort_order: 0, default_mileage_interval: null, default_time_interval_days: 730, reminder_lead_days: 14 },
  { name: 'bulb_replacement', display_name: 'Headlight/Bulb Replacement', category: 'lighting', description: 'Replace headlight, taillight, or signal bulbs', sort_order: 1, default_mileage_interval: null, default_time_interval_days: 730, reminder_lead_days: 14 },
  { name: 'radiator_hose_inspection', display_name: 'Radiator Hose Inspection', category: 'cooling', description: 'Inspect radiator hoses for cracks, bulges, and leaks', sort_order: 2, default_mileage_interval: null, default_time_interval_days: 730, reminder_lead_days: 14 },
]

const TEMPLATE_DEFS = [
  { name: 'Two Weeks Before', body: DEFAULT_TEMPLATES.twoWeeksBefore },
  { name: 'One Week Before', body: DEFAULT_TEMPLATES.oneWeekBefore },
  { name: 'Due Date', body: DEFAULT_TEMPLATES.dueDateReminder },
  { name: 'One Week Overdue', body: DEFAULT_TEMPLATES.oneWeekOverdue },
  { name: 'Two Weeks Overdue', body: DEFAULT_TEMPLATES.twoWeeksOverdue },
] as const

// [sequenceNumber, offsetDays, templateIndex]
const RULE_SEQUENCES: [number, number, number][] = [
  [1, -14, 0],
  [2, -7, 1],
  [3, 0, 2],
  [4, 7, 3],
  [5, 14, 4],
]

/** Category display names for UI grouping */
export const SERVICE_CATEGORIES: Record<string, string> = {
  oil_change: 'Oil Change', tires: 'Tires', brakes: 'Brakes',
  transmission: 'Transmission', cooling: 'Cooling System',
  electrical: 'Electrical', filters: 'Filters', wipers: 'Wipers',
  fluids: 'Fluids', inspection: 'Inspection', alignment: 'Wheel Alignment',
  engine: 'Engine', belts: 'Belts & Timing', fuel_system: 'Fuel System',
  drivetrain: 'Drivetrain', ac: 'AC / Climate', exhaust: 'Exhaust',
  suspension: 'Suspension', emissions: 'Emissions', lighting: 'Lighting',
  general: 'General',
}

async function ensureServiceTypes(orgId: string, db: Awaited<ReturnType<typeof createProductAdminClient>>) {
  const { data: existing } = await db
    .from('service_types')
    .select('name')
    .eq('org_id', orgId)

  const existingNames = new Set((existing ?? []).map((st: { name: string }) => st.name))
  const missing = DEFAULT_SERVICE_TYPES.filter((st) => !existingNames.has(st.name))

  if (missing.length > 0) {
    await db.from('service_types').insert(
      missing.map((st) => ({ org_id: orgId, is_custom: false, is_active: true, ...st }))
    )
  }

  const { data } = await db.from('service_types').select('id').eq('org_id', orgId)
  return data ?? []
}

async function ensureTemplates(orgId: string, db: Awaited<ReturnType<typeof createProductAdminClient>>) {
  const { count } = await db
    .from('reminder_templates')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  if (count && count > 0) {
    const { data } = await db.from('reminder_templates').select('id').eq('org_id', orgId)
    return data ?? []
  }

  const { data } = await db
    .from('reminder_templates')
    .insert(
      TEMPLATE_DEFS.map((t) => ({ org_id: orgId, name: t.name, body: t.body, is_default: true }))
    )
    .select('id')

  return data ?? []
}

async function ensureReminderRules(
  orgId: string,
  serviceTypes: { id: string }[],
  templates: { id: string }[],
  db: Awaited<ReturnType<typeof createProductAdminClient>>
) {
  const { count } = await db
    .from('reminder_rules')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  if (count && count > 0) return

  const rules = serviceTypes.flatMap((st) =>
    RULE_SEQUENCES.map(([seq, offset, tplIdx]) => ({
      org_id: orgId,
      service_type_id: st.id,
      sequence_number: seq,
      offset_days: offset,
      template_id: templates[tplIdx]?.id ?? null,
      is_active: true,
      reminder_type: 'service_due',
    }))
  )

  if (rules.length > 0) {
    await db.from('reminder_rules').insert(rules)
  }
}

export async function seedOrgDefaults(orgId: string) {
  const db = await createProductAdminClient()
  const serviceTypes = await ensureServiceTypes(orgId, db)
  const templates = await ensureTemplates(orgId, db)
  await ensureReminderRules(orgId, serviceTypes, templates, db)
}
