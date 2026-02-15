import { PrismaClient, CustomerStatus } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage } from '../lib/customer-status'

const prisma = new PrismaClient()

async function main() {
  // Create a test organization
  const org = await prisma.organization.upsert({
    where: { clerkOrgId: 'test_org_123' },
    update: {},
    create: {
      clerkOrgId: 'test_org_123',
      name: 'Test Auto Shop',
      slug: 'test-auto-shop',
      subscriptionStatus: 'trial',
      subscriptionTier: 'professional'
    }
  })

  console.log('Created organization:', org.name)

  // Create sample customers
  const customers = [
    {
      firstName: 'John',
      lastName: 'Smith',
      phone: '5551234567',
      email: 'john@example.com',
      status: CustomerStatus.overdue,
      vehicles: [
        { year: 2019, make: 'Toyota', model: 'Camry', licensePlate: 'ABC123' }
      ],
      lastService: { daysAgo: 120, mileage: 45000 }
    },
    {
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '5559876543',
      email: 'sarah@example.com',
      status: CustomerStatus.due_now,
      vehicles: [
        { year: 2020, make: 'Honda', model: 'Civic', licensePlate: 'XYZ789' }
      ],
      lastService: { daysAgo: 85, mileage: 32000 }
    },
    {
      firstName: 'Mike',
      lastName: 'Williams',
      phone: '5554567890',
      email: 'mike@example.com',
      status: CustomerStatus.due_soon,
      vehicles: [
        { year: 2018, make: 'Ford', model: 'F-150', licensePlate: 'TRUCK1' }
      ],
      lastService: { daysAgo: 70, mileage: 55000 }
    },
    {
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '5557890123',
      email: 'emily@example.com',
      status: CustomerStatus.up_to_date,
      vehicles: [
        { year: 2021, make: 'Tesla', model: 'Model 3', licensePlate: 'EV2021' }
      ],
      lastService: { daysAgo: 14, mileage: 15000 }
    }
  ]

  for (const customerData of customers) {
    const customer = await prisma.customer.create({
      data: {
        firstName: customerData.firstName,
        lastName: customerData.lastName,
        phone: customerData.phone,
        email: customerData.email,
        status: customerData.status,
        orgId: org.clerkOrgId,
        vehicles: {
          create: customerData.vehicles.map(v => ({
            year: v.year,
            make: v.make,
            model: v.model,
            licensePlate: v.licensePlate,
            mileageAtLastService: customerData.lastService.mileage,
            serviceRecords: {
              create: [{
                serviceDate: new Date(Date.now() - customerData.lastService.daysAgo * 24 * 60 * 60 * 1000),
                mileageAtService: customerData.lastService.mileage,
                serviceType: 'oil_change',
                nextDueDate: calculateNextDueDate(new Date(Date.now() - customerData.lastService.daysAgo * 24 * 60 * 60 * 1000)),
                nextDueMileage: calculateNextDueMileage(customerData.lastService.mileage)
              }]
            }
          }))
        }
      }
    })
    console.log(`Created customer: ${customer.firstName} ${customer.lastName}`)
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
