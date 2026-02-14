# OttoManagerPro - Service Reminder Implementation Plan

## Overview

Expand OttoManagerPro from oil-change-only reminders to full-service auto shop reminders. This plan covers database schema updates, backend logic changes, and UI additions.

---

## Phase 1: Database Schema Updates

### Current State
- `ServiceType` model exists with `defaultMileageInterval` and `defaultTimeIntervalDays`
- `ReminderRule` model uses `offsetDays` for timing
- `ReminderTemplate` for SMS templates

### Required Additions

#### 1. Add Service Intervals to ServiceType (New Fields)

```prisma
// Add to ServiceType model
model ServiceType {
  // ... existing fields ...

  // NEW: Time-based reminder intervals
  defaultTimeIntervalDays  Int?     // 90, 180, 365 days
  defaultTimeIntervalMonths Int?    // 6, 12 months

  // NEW: Seasonal options
  isSeasonal           Boolean @default(false)
  seasonalTrigger       String?  // "before_summer", "before_winter", "spring", "fall"

  // NEW: Mileage-based reminder
  defaultMileageInterval Int?      // 5000, 7500, 10000 miles
  mileageThresholdLow    Int?      // Warning threshold (e.g., 4500)
  mileageThresholdHigh   Int?      // Critical threshold (e.g., 5500)

  // NEW: Priority/Category
  category            ServiceCategory @default(MAINTENANCE)
}

enum ServiceCategory {
  MAINTENANCE      // Oil changes, tire rotation, filters
  INSPECTION        // Brake inspection, multi-point
  FLUID_SERVICE     // Coolant, brake fluid, transmission
  REPLACEMENT       // Battery, wiper blades, air filters
  SEASONAL          // Pre-winter, pre-summer checks
}
```

#### 2. Add Vehicle Service Preferences

```prisma
// NEW: Track vehicle-specific preferences
model Vehicle {
  // ... existing fields ...

  preferredMileageInterval  Int?     // Override shop default
  preferredTimeIntervalDays Int?     // Override shop default
  lastMileageUpdate        DateTime? // When mileage was last entered
}
```

#### 3. Add Service History Tracking

```prisma
// NEW: Track all services performed (not just oil changes)
model ServiceHistory {
  id                String   @id @default(cuid())
  vehicleId         String
  vehicle           Vehicle  @relation(fields: [vehicleId], references: [id], onDelete: Cascade)

  serviceTypeId    String
  serviceType      ServiceType @relation(fields: [serviceTypeId], references: [id])

  serviceDate      DateTime
  mileage          Int

  // For mileage-based services
  milesSinceLast   Int?

  // For time-based services
  daysSinceLast    Int?

  // Service details
  notes            String?
  cost             Decimal?

  // Next service prediction
  predictedNextDate DateTime?
  predictedNextMileage Int?

  createdAt         DateTime @default(now())

  @@index([vehicleId])
  @@index([serviceDate])
  @@map("service_history")
}
```

---

## Phase 2: Seed Data - Default Service Types

Add these to `prisma/seed.ts`:

```typescript
const DEFAULT_SERVICES = [
  // MAINTENANCE
  {
    name: 'oil_change_conventional',
    displayName: 'Oil Change (Conventional)',
    defaultMileageInterval: 5000,
    defaultTimeIntervalDays: 180,
    reminderLeadDays: 14,
    category: 'MAINTENANCE',
  },
  {
    name: 'oil_change_synthetic',
    displayName: 'Oil Change (Synthetic)',
    defaultMileageInterval: 7500,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
    category: 'MAINTENANCE',
  },
  {
    name: 'tire_rotation',
    displayName: 'Tire Rotation',
    defaultMileageInterval: 6000,
    defaultTimeIntervalDays: 180,
    reminderLeadDays: 7,
    category: 'MAINTENANCE',
  },

  // INSPECTION
  {
    name: 'brake_inspection',
    displayName: 'Brake Inspection',
    defaultMileageInterval: 15000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
    category: 'INSPECTION',
  },

  // FLUID_SERVICE
  {
    name: 'brake_fluid_flush',
    displayName: 'Brake Fluid Flush',
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 730,  // 2 years
    reminderLeadDays: 30,
    category: 'FLUID_SERVICE',
  },
  {
    name: 'transmission_service',
    displayName: 'Transmission Service',
    defaultMileageInterval: 45000,
    defaultTimeIntervalDays: 730,
    reminderLeadDays: 30,
    category: 'FLUID_SERVICE',
  },
  {
    name: 'coolant_flush',
    displayName: 'Coolant/Radiator Service',
    defaultMileageInterval: 30000,
    defaultTimeIntervalDays: 1095,  // 3 years
    reminderLeadDays: 30,
    category: 'FLUID_SERVICE',
  },
  {
    name: 'power_steering',
    displayName: 'Power Steering Fluid',
    defaultMileageInterval: 50000,
    defaultTimeIntervalDays: 1095,
    reminderLeadDays: 30,
    category: 'FLUID_SERVICE',
  },

  // REPLACEMENT
  {
    name: 'battery_replacement',
    displayName: 'Battery Test/Replacement',
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
    category: 'REPLACEMENT',
    isSeasonal: true,
    seasonalTrigger: 'before_winter',
  },
  {
    name: 'engine_air_filter',
    displayName: 'Engine Air Filter',
    defaultMileageInterval: 15000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
    category: 'REPLACEMENT',
  },
  {
    name: 'cabin_air_filter',
    displayName: 'Cabin Air Filter',
    defaultMileageInterval: 15000,
    defaultTimeIntervalDays: 365,
    reminderLeadDays: 14,
    category: 'REPLACEMENT',
  },
  {
    name: 'wiper_blades',
    displayName: 'Wiper Blade Replacement',
    defaultMileageInterval: null,
    defaultTimeIntervalDays: 180,  // 6 months
    reminderLeadDays: 14,
    category: 'REPLACEMENT',
    isSeasonal: true,
    seasonalTrigger: 'before_winter',
  },
]

const DEFAULT_REMINDER_TEMPLATES = {
  oil_change: {
    firstReminder: "Hi {{firstName}}! Your {{vehicleYear}} {{vehicleMake}} is due for an oil change at {{milesToService}} mi. Schedule now: {{bookingLink}} - {{shopName}}",
    dueDateReminder: "Hi {{firstName}}! Your oil change is DUE TODAY at {{shopName}}. Book: {{bookingLink}}",
    overdueReminder: "Hi {{firstName}}! Your oil change is {{daysOverdue}} days overdue. {{shopName}} can fit you in today: {{bookingLink}}",
  },
  tire_rotation: {
    firstReminder: "Hi {{firstName}}! Time to rotate those tires on your {{vehicleYear}} {{vehicleMake}}. {{milesSinceLastRotation}} mi since last rotation. Book: {{bookingLink}}",
    dueDateReminder: "Tire rotation due on your {{vehicleMake}}! {{shopName}} has availability: {{bookingLink}}",
  },
  brake_service: {
    firstReminder: "Hi {{firstName}}! Your {{vehicleYear}} {{vehicleMake}} needs a brake inspection at {{milesToService}} mi. Stay safe - book: {{bookingLink}}",
  },
  battery: {
    firstReminder: "Hi {{firstName}}! Cold weather is coming. Test your battery at {{shopName}} before winter. Book: {{bookingLink}}",
  },
  seasonal: {
    spring: "Hi {{firstName}}! Spring is here - time for a vehicle checkup at {{shopName}}. Book your multi-point inspection: {{bookingLink}}",
    fall: "Hi {{firstName}}! Get ready for winter! Schedule your pre-season checkup at {{shopName}}: {{bookingLink}}",
  },
}
```

---

## Phase 3: Backend Logic Updates

### 3.1 Update `lib/reminder-engine.ts`

Key changes:

```typescript
interface ServiceReminderInput {
  vehicle: Vehicle
  serviceType: ServiceType
  currentMileage: number
  lastServiceDate: Date
  lastServiceMileage: number
}

export async function evaluateServiceReminders(
  org: OrgInput,
  input: ServiceReminderInput
): Promise<ReminderCandidate[]> {
  const candidates: ReminderCandidate[] = []
  const { serviceType, vehicle, currentMileage } = input

  // 1. Check mileage-based reminder
  if (serviceType.defaultMileageInterval && currentMileage > 0) {
    const milesSinceLast = currentMileage - input.lastServiceMileage
    const milesToService = serviceType.defaultMileageInterval - milesSinceLast

    if (milesToService <= serviceType.mileageThresholdLow ||
        milesToService <= 0) {
      candidates.push({
        type: 'mileage',
        serviceType,
        urgency: milesToService <= 0 ? 'overdue' : 'due_soon',
        milesUntilDue: Math.max(0, milesToService),
        triggerDate: new Date(),
      })
    }
  }

  // 2. Check time-based reminder
  if (serviceType.defaultTimeIntervalDays) {
    const daysSinceLast = Math.floor(
      (Date.now() - input.lastServiceDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const daysToService = serviceType.defaultTimeIntervalDays - daysSinceLast

    if (daysToService <= serviceType.reminderLeadDays || daysToService <= 0) {
      candidates.push({
        type: 'time',
        serviceType,
        urgency: daysToService <= 0 ? 'overdue' : 'due_soon',
        daysUntilDue: Math.max(0, daysToService),
        triggerDate: calculateTriggerDate(daysToService),
      })
    }
  }

  // 3. Check seasonal reminder
  if (serviceType.isSeasonal && serviceType.seasonalTrigger) {
    const seasonalCandidate = evaluateSeasonalReminder(
      serviceType.seasonalTrigger,
      org
    )
    if (seasonalCandidate) {
      candidates.push(seasonalCandidate)
    }
  }

  return candidates
}
```

### 3.2 Add Mileage Tracking API

```typescript
// app/api/vehicles/[id]/mileage/route.ts
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { mileage } = await request.json()

  // Update vehicle mileage
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      mileageAtLastService: mileage,
      lastMileageUpdate: new Date(),
    },
  })

  // Create service history record
  await prisma.serviceHistory.create({
    data: {
      vehicleId: id,
      serviceTypeId: 'mileage_update',  // Special type
      serviceDate: new Date(),
      mileage,
    },
  })

  // Trigger reminder evaluation
  await triggerReminderEvaluation(vehicle)

  return NextResponse.json({ success: true, vehicle })
}
```

### 3.3 Add Seasonal Reminder Logic

```typescript
// lib/seasonal-engine.ts
export function evaluateSeasonalReminders(
  org: Organization,
  vehicles: Vehicle[]
): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = []
  const now = new Date()
  const month = now.getMonth()  // 0-11

  // Winter preparation: October-November
  if (month >= 9 && month <= 10) {
    const winterServices = ['battery_test', 'coolant_check', 'wiper_blades']
    for (const vehicle of vehicles) {
      for (const serviceName of winterServices) {
        const serviceType = await getServiceType(org.clerkOrgId, serviceName)
        if (needsSeasonalReminder(vehicle, serviceType)) {
          candidates.push({
            type: 'seasonal',
            serviceType,
            urgency: 'due_soon',
            seasonalTrigger: 'before_winter',
          })
        }
      }
    }
  }

  // Spring maintenance: March-April
  if (month >= 2 && month <= 3) {
    const springServices = ['ac_check', 'battery_test', 'cabin_filter']
    // Similar logic...
  }

  return candidates
}
```

---

## Phase 4: UI Components

### 4.1 Service Type Management Page

```typescript
// app/(dashboard)/settings/service-types/page.tsx
export default function ServiceTypesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1>Service Types</h1>
        <Button>+ Add Service Type</Button>
      </div>

      {/* Service Categories */}
      <Tabs defaultValue="maintenance">
        <TabsList>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="inspection">Inspection</TabsTrigger>
          <TabsTrigger value="fluid">Fluid Service</TabsTrigger>
          <TabsTrigger value="replacement">Replacement</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
        </TabsList>

        <TabsContent value="maintenance">
          <ServiceTypeCard
            name="Oil Change (Conventional)"
            mileage={5000}
            time="180 days"
            icon="oil"
          />
          <ServiceTypeCard
            name="Tire Rotation"
            mileage={6000}
            time="180 days"
            icon="tire"
          />
        </TabsContent>
        {/* Other tabs... */}
      </Tabs>
    </div>
  )
}
```

### 4.2 Vehicle Detail Page - Service History

```typescript
// app/(dashboard)/vehicles/[id]/page.tsx
export default async function VehicleDetailPage({ params }: Props) {
  const vehicle = await getVehicle(params.id)
  const services = await getServiceHistory(params.id)

  return (
    <div className="space-y-6">
      <VehicleHeader vehicle={vehicle} />

      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Service History</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>

        <TabsContent value="services">
          <ServiceTimeline services={services} />

          <div className="mt-4">
            <AddServiceForm vehicleId={vehicle.id} />
          </div>
        </TabsContent>

        <TabsContent value="reminders">
          <UpcomingReminders vehicle={vehicle} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### 4.3 Service Reminder Dashboard Widget

```typescript
// components/dashboard/service-reminders-widget.tsx
export function ServiceRemindersWidget({ orgId }: { orgId: string }) {
  const [stats] = useQuery({
    queryKey: ['reminder-stats', orgId],
    queryFn: () => fetchReminderStats(orgId),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Service Reminders</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Due This Week"
            value={stats.dueThisWeek}
            icon="alert"
            color="yellow"
          />
          <StatCard
            label="Scheduled"
            value={stats.scheduled}
            icon="calendar"
            color="blue"
          />
          <StatCard
            label="Overdue"
            value={stats.overdue}
            icon="warning"
            color="red"
          />
        </div>

        <div className="mt-4 space-y-2">
          {stats.topReminders.slice(0, 5).map((reminder) => (
            <ReminderItem
              key={reminder.id}
              customer={reminder.customer}
              vehicle={reminder.vehicle}
              service={reminder.serviceType}
              dueDate={reminder.nextDueDate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
```

### 4.4 Add Service Form

```typescript
// components/add-service-form.tsx
"use client"

export function AddServiceForm({ vehicleId }: { vehicleId: string }) {
  const [serviceType, setServiceType] = useState('')
  const [mileage, setMileage] = useState('')
  const [notes, setNotes] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await fetch('/api/services', {
      method: 'POST',
      body: JSON.stringify({
        vehicleId,
        serviceType,
        mileage: Number(mileage),
        notes,
      }),
    })
    // Refresh data...
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Select value={serviceType} onValueChange={setServiceType}>
        <SelectTrigger>
          <SelectValue placeholder="Select service type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="oil_change_conventional">Oil Change (Conventional)</SelectItem>
          <SelectItem value="oil_change_synthetic">Oil Change (Synthetic)</SelectItem>
          <SelectItem value="tire_rotation">Tire Rotation</SelectItem>
          <SelectItem value="brake_inspection">Brake Inspection</SelectItem>
          <SelectItem value="brake_fluid_flush">Brake Fluid Flush</SelectItem>
          <SelectItem value="transmission_service">Transmission Service</SelectItem>
          <SelectItem value="coolant_flush">Coolant Flush</SelectItem>
          <SelectItem value="battery_replacement">Battery Test/Replacement</SelectItem>
          <SelectItem value="engine_air_filter">Engine Air Filter</SelectItem>
          <SelectItem value="cabin_air_filter">Cabin Air Filter</SelectItem>
          <SelectItem value="wiper_blades">Wiper Blades</SelectItem>
          <SelectItem value="power_steering">Power Steering Fluid</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="number"
        placeholder="Current mileage"
        value={mileage}
        onChange={(e) => setMileage(e.target.value)}
      />

      <Textarea
        placeholder="Service notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Button type="submit">Add Service Record</Button>
    </form>
  )
}
```

---

## Phase 5: Cron Job Updates

### 5.1 Updated Cron Endpoints

```typescript
// app/api/cron/process-mileage-reminders/route.ts
// Runs DAILY - evaluates mileage-based reminders

// app/api/cron/process-time-reminders/route.ts
// Runs WEEKLY - evaluates time-based reminders

// app/api/cron/process-seasonal-reminders/route.ts
// Runs MONTHLY - evaluates seasonal reminders
```

### 5.2 Cron Schedule

| Job | Schedule | Purpose |
|-----|----------|---------|
| Process Mileage Reminders | Daily 8 AM | Check vehicles approaching service mileage |
| Process Time Reminders | Weekly (Sunday 8 AM) | Check vehicles approaching service dates |
| Process Seasonal | 1st of month | Pre-winter, pre-summer checks |
| Send Queued Messages | Every 15 min | Batch SMS sending |

---

## Implementation Order

### Week 1: Foundation
1. [ ] Update Prisma schema (ServiceType fields, ServiceHistory model)
2. [ ] Add seed data for all 11 service types
3. [ ] Update reminder-engine.ts for mileage-based triggers
4. [ ] Create mileage tracking API

### Week 2: UI Development
1. [ ] Service Types management page
2. [ ] Vehicle detail - Service History tab
3. [ ] Add Service form with service type selector
4. [ ] Dashboard reminders widget

### Week 3: Advanced Features
1. [ ] Time-based reminder logic
2. [ ] Seasonal reminder system
3. [ ] Service combination recommendations
4. [ ] Reminder template management UI

### Week 4: Polish & Testing
1. [ ] End-to-end testing
2. [ ] SMS template customization
3. [ ] Analytics dashboard for reminders
4. [ ] Documentation

---

## File Changes Summary

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add ServiceType fields, ServiceHistory model, enum |
| `prisma/seed.ts` | Add 11 default service types |
| `lib/reminder-engine.ts` | Add mileage + time evaluation logic |
| `lib/seasonal-engine.ts` | NEW - Seasonal reminder logic |
| `lib/service-history.ts` | NEW - Service history utilities |
| `app/api/vehicles/[id]/mileage/route.ts` | NEW - Mileage update endpoint |
| `app/api/services/route.ts` | NEW - Service record creation |
| `app/(dashboard)/settings/service-types/page.tsx` | NEW - Service management |
| `app/(dashboard)/vehicles/[id]/page.tsx` | Add Service History tab |
| `components/add-service-form.tsx` | NEW - Service entry form |
| `components/dashboard/service-reminders-widget.tsx` | NEW - Dashboard widget |

---

## Backward Compatibility

- Existing oil change reminders continue to work
- `ServiceType.name` unchanged (oil_change, etc.)
- `ReminderRule` uses existing offsetDays pattern
- `ReminderTemplate` system works for all service types

---

## Dependencies

- No new external dependencies
- Uses existing Twilio, Prisma, Clerk infrastructure
- Tailwind CSS v4 (already in use)
- shadcn/ui components (already in use)
