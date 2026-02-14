# OttoManagerPro - Service Reminder System

## Overview

This document outlines the services for which auto mechanic shops can send SMS/email reminders and the logic behind each service reminder.

---

## Core Service Reminder Categories

### 1. Oil Change
**Trigger:** Mileage or Time-based

| Parameter | Value |
|-----------|--------|
| Standard Interval | Every 5,000 - 7,500 miles |
| Synthetic Oil | Every 7,500 - 10,000 miles |
| Severe Driving Conditions | Every 3,000 - 5,000 miles |

**Reminder Logic:**
- Calculate next service date based on:
  - Current mileage + interval mileage
  - OR last service date + 6 months (whichever comes first)
- Send reminders at:
  - 2 weeks before due date
  - 1 week before due date
  - On the due date
  - 1 week overdue
  - 2 weeks overdue

**Sample SMS:**
> "Hi [Customer Name]! Your [Vehicle] is due for an oil change at [Mileage]. Schedule your appointment now - click: [Link]"

---

### 2. Tire Rotation
**Trigger:** Mileage-based

| Parameter | Value |
|-----------|--------|
| Standard Interval | Every 5,000 - 8,000 miles |
| Performance Tires | Every 5,000 miles |

**Reminder Logic:**
- Schedule based on mileage progression from last rotation
- Trigger at: 500 miles before due, on due date
- Send seasonal reminders (spring/fall) for tire inspections

**Sample SMS:**
> "Hi [Customer Name]! It's time to rotate your tires on your [Vehicle]. [X,XXX] miles since last rotation. Book online: [Link]"

---

### 3. Brake Service
**Trigger:** Mileage or Time-based

| Parameter | Value |
|-----------|--------|
| Brake Pad Inspection | Every 15,000 miles |
| Brake Fluid Flush | Every 30,000 - 45,000 miles |
| Brake Pad Replacement | Every 25,000 - 70,000 miles (varies by driving style) |

**Reminder Logic:**
- Track mileage since last inspection
- Flag vehicles approaching inspection interval
- Urgent reminder if pads showing wear patterns

**Sample SMS:**
> "Hi [Customer Name]! Your [Vehicle] is approaching [X,XXX] miles - time for a brake inspection. Book now: [Link]"

---

### 4. Transmission Service
**Trigger:** Mileage or Time-based

| Parameter | Value |
|-----------|--------|
| Fluid Check | Every 30,000 miles |
| Fluid Change (Standard) | Every 30,000 - 60,000 miles |
| Fluid Change (Synthetic) | Every 50,000 - 100,000 miles |

**Reminder Logic:**
- Follow manufacturer intervals for transmission type
- Longer intervals for modern synthetic fluids
- Flag vehicles with known transmission issues

**Sample SMS:**
> "Hi [Customer Name]! Your [Vehicle] transmission service is due at [X,XXX] miles. Keep your transmission healthy - schedule: [Link]"

---

### 5. Cooling System (Radiator/Coolant)
**Trigger:** Mileage or Time-based

| Parameter | Value |
|-----------|--------|
| Coolant Flush | Every 30,000 - 60,000 miles |
| Coolant Top-off | Every 12 months |
| Radiator Hose Inspection | Every 24 months |

**Reminder Logic:**
- Time-based reminder (every 2-3 years) even with low mileage
- Track mileage since last flush
- Seasonal reminder before summer/winter extremes

**Sample SMS:**
> "Hi [Customer Name]! Time to check your coolant system on [Vehicle]. Book a flush before the heat: [Link]"

---

### 6. Battery Service
**Trigger:** Time-based (Seasonal)

| Parameter | Value |
|-----------|--------|
| Battery Test | Every 12 months |
| Battery Replacement | Every 3-5 years |

**Reminder Logic:**
- Test batteries approaching 3-year mark
- Fall reminder before winter (batteries fail in cold)
- Spring reminder after harsh winter

**Sample SMS:**
> "Hi [Customer Name]! Your battery is [X] years old. Get it tested before winter - click: [Link]"

---

### 7. Air Filter Replacement
**Trigger:** Mileage-based

| Parameter | Value |
|-----------|--------|
| Engine Air Filter | Every 15,000 - 30,000 miles |
| Cabin Air Filter | Every 12,000 - 30,000 miles |

**Reminder Logic:**
- Shorter intervals for dusty/dirty driving conditions
- Remind at mileage intervals AND annually

**Sample SMS:**
> "Hi [Customer Name]! Your engine air filter may need replacing at [X,XXX] miles. Better airflow = better MPG. Book: [Link]"

---

### 8. Wiper Blade Replacement
**Trigger:** Time-based or Mileage-based

| Parameter | Value |
|-----------|--------|
| Replacement | Every 6 - 12 months |
| Inspection | Every oil change |

**Reminder Logic:**
- Seasonal reminders (before rainy season, before winter)
- Annual replacement recommendation

**Sample SMS:**
> "Hi [Customer Name]! It's been [X] months since your wiper blades were replaced. Stay safe in the rain - order new blades: [Link]"

---

### 9. Brake Fluid Flush
**Trigger:** Mileage or Time-based

| Parameter | Value |
|-----------|--------|
| Standard | Every 30,000 miles |
| Heavy-duty | Every 20,000 miles |
| Time-based | Every 24-36 months |

**Reminder Logic:**
- Track both mileage and time
- Critical for ABS system health

**Sample SMS:**
> "Hi [Customer Name]! Brake fluid flush due on your [Vehicle] at [X,XXX] miles. Keep brakes working perfectly: [Link]"

---

### 10. Power Steering Fluid
**Trigger:** Mileage-based

| Parameter | Value |
|-----------|--------|
| Check | Every 30,000 miles |
| Replacement | Every 50,000 - 75,000 miles |

**Reminder Logic:**
- Check during routine inspections
- Replace if fluid is dark/contaminated

---

### 11. Cabin Air Quality Service
**Trigger:** Mileage or Time-based

| Parameter | Value |
|-----------|--------|
| Filter Replacement | Every 12,000 - 30,000 miles |
| AC System Check | Every 24 months |

**Reminder Logic:**
- Seasonal (before summer AC season)
- Allergy season reminders (spring)

**Sample SMS:**
> "Hi [Customer Name]! Ready for cleaner air in your [Vehicle]? Replace your cabin filter before allergy season: [Link]"

---

## Reminder Types & Timing

### 1. Appointment Reminders
| Timing | Channel | Purpose |
|--------|---------|---------|
| 2 weeks before | Email | Advance notice |
| 3 days before | SMS + Email | Primary reminder |
| 1 day before | SMS | Final reminder |
| Day of (morning) | SMS | Same-day reminder |
| 2 hours before | SMS | Appointment approaching |

### 2. Service Due Reminders
| Timing | Channel | Purpose |
|--------|---------|---------|
| 2 weeks before due | Email | Advance notice |
| Due date | SMS + Email | Service due today |
| 1 week overdue | SMS | Urgency notice |
| 2 weeks overdue | SMS + Email | Critical notice |

### 3. Follow-up Reminders
| Timing | Channel | Purpose |
|--------|---------|---------|
| 1 week after service | SMS | Satisfaction check |
| 30 days after service | Email | Review request |
| 90 days after service | Email | Loyalty reminder |

---

## Recommended Service Combinations

### Combo A (Quick Lube)
- Oil Change + Tire Rotation + Wiper Blades

### Combo B (Full Service)
- Oil Change + Tire Rotation + Air Filter + Fluid Top-off

### Combo C (Comprehensive)
- Oil Change + Tire Rotation + Brake Inspection + All Filters

### Combo D (Seasonal)
- Battery Test + Coolant Check + Wiper Blades + AC Service

---

## Data Model Requirements

### Vehicle Service History
```typescript
interface ServiceRecord {
  id: string;
  vehicleId: string;
  serviceType: ServiceType;
  serviceDate: Date;
  mileage: number;
  technicianNotes?: string;
  cost?: number;
}

interface ServiceReminder {
  id: string;
  vehicleId: string;
  serviceType: ServiceType;
  nextDueDate?: Date;
  nextDueMileage?: number;
  reminderSent: boolean;
  lastReminderSent?: Date;
}
```

### Service Types
```typescript
enum ServiceType {
  OIL_CHANGE = 'oil_change',
  TIRE_ROTATION = 'tire_rotation',
  BRAKE_INSPECTION = 'brake_inspection',
  BRAKE_FLUID = 'brake_fluid',
  TRANSMISSION = 'transmission',
  COOLANT = 'coolant',
  BATTERY = 'battery',
  AIR_FILTER = 'air_filter',
  CABIN_FILTER = 'cabin_filter',
  WIPER_BLADES = 'wiper_blades',
  POWER_STEERING = 'power_steering',
  INSPECTION = 'inspection',
}
```

---

## SMS Template Examples

### Oil Change Reminder
```
Hi {customer_name}! Your {vehicle} needs an oil change at {current_mileage} mi.
Book now: {booking_link}
-OttoManagerPro
```

### Tire Rotation Reminder
```
Hi {customer_name}! Time to rotate those tires on your {vehicle}.
We've noticed you've driven {miles_since_rotation} mi since last rotation.
Schedule: {booking_link}
```

### Multi-Service Reminder
```
Hi {customer_name}! Your {vehicle} is due for:
- Oil Change ({miles_to_service} mi)
- Tire Rotation ({miles_to_rotation} mi)
Book all at once: {booking_link}
```

### Seasonal Battery Check
```
Hi {customer_name}! Cold weather is coming. Test your {vehicle} battery before winter.
Free battery test at {shop_name}. Book: {booking_link}
```

---

## Implementation Priority

### Phase 1 (Current)
- [x] Oil Change Reminders
- [x] Basic SMS/Email Templates

### Phase 2 (Next)
- [ ] Tire Rotation Reminders
- [ ] Brake Service Reminders
- [ ] Battery Seasonal Reminders

### Phase 3 (Future)
- [ ] All Service Types
- [ ] Predictive Reminders (based on driving patterns)
- [ ] Telematics Integration
- [ ] Fleet Management Reminders

---

## References

- AutoZone Maintenance Schedule Guide
- AAA Time-Stamped Maintenance Checklist
- CARFAX Car Maintenance Schedules
- Jiffy Lube Vehicle Maintenance Schedule
- Geotab Maintenance Intervals Guide
