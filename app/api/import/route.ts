import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CustomerStatus } from '@prisma/client'
import { calculateNextDueDate, calculateNextDueMileage } from '@/lib/customer-status'

export async function POST(request: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Read CSV content
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 })
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    
    // Validate required headers
    const requiredHeaders = ['firstname', 'lastname', 'phone']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingHeaders.join(', ')}` 
      }, { status: 400 })
    }

    // Get column indices
    const colIndex = {
      firstName: headers.indexOf('firstname'),
      lastName: headers.indexOf('lastname'),
      phone: headers.indexOf('phone'),
      email: headers.indexOf('email'),
      vehicleYear: headers.indexOf('vehicleyear'),
      vehicleMake: headers.indexOf('vehiclemake'),
      vehicleModel: headers.indexOf('vehiclemodel'),
      licensePlate: headers.indexOf('licenseplate'),
      lastServiceDate: headers.indexOf('lastservicedate'),
      lastServiceMileage: headers.indexOf('lastservicemileage')
    }

    let success = 0
    let errors = 0
    let duplicates = 0
    const errorMessages: string[] = []

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      try {
        const row = parseCSVLine(lines[i])
        
        const firstName = row[colIndex.firstName]?.trim()
        const lastName = row[colIndex.lastName]?.trim()
        const phone = row[colIndex.phone]?.trim()
        const email = row[colIndex.email]?.trim() || null

        if (!firstName || !lastName || !phone) {
          errors++
          errorMessages.push(`Row ${i}: Missing required fields`)
          continue
        }

        // Clean phone number
        const cleanPhone = phone.replace(/\D/g, '')
        if (cleanPhone.length < 10) {
          errors++
          errorMessages.push(`Row ${i}: Invalid phone number`)
          continue
        }

        // Check for duplicate phone number
        const existing = await prisma.customer.findFirst({
          where: { orgId, phone: cleanPhone }
        })

        if (existing) {
          duplicates++
          continue
        }

        // Parse vehicle data
        const vehicleYear = colIndex.vehicleYear >= 0 ? parseInt(row[colIndex.vehicleYear]) : null
        const vehicleMake = colIndex.vehicleMake >= 0 ? row[colIndex.vehicleMake]?.trim() : null
        const vehicleModel = colIndex.vehicleModel >= 0 ? row[colIndex.vehicleModel]?.trim() : null
        const licensePlate = colIndex.licensePlate >= 0 ? row[colIndex.licensePlate]?.trim() : null
        
        const lastServiceDate = colIndex.lastServiceDate >= 0 ? row[colIndex.lastServiceDate]?.trim() : null
        const lastServiceMileage = colIndex.lastServiceMileage >= 0 ? parseInt(row[colIndex.lastServiceMileage]) : null

        // Create customer with optional vehicle and service record
        const customerData: any = {
          firstName,
          lastName,
          phone: cleanPhone,
          email,
          status: CustomerStatus.up_to_date,
          orgId
        }

        // Add vehicle if data provided
        if (vehicleYear && vehicleMake && vehicleModel) {
          customerData.vehicles = {
            create: [{
              year: vehicleYear,
              make: vehicleMake,
              model: vehicleModel,
              licensePlate: licensePlate || null,
              mileageAtLastService: lastServiceMileage || null,
              serviceRecords: lastServiceDate && lastServiceMileage ? {
                create: [{
                  serviceDate: new Date(lastServiceDate),
                  mileageAtService: lastServiceMileage,
                  serviceType: 'oil_change',
                  nextDueDate: calculateNextDueDate(new Date(lastServiceDate)),
                  nextDueMileage: calculateNextDueMileage(lastServiceMileage)
                }]
              } : undefined
            }]
          }
        }

        await prisma.customer.create({ data: customerData })
        success++
      } catch (err) {
        errors++
        errorMessages.push(`Row ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success,
      errors,
      duplicates,
      message: errors > 0 
        ? `Imported ${success} customers with ${errors} errors` 
        : `Successfully imported ${success} customers`,
      details: errors > 0 ? errorMessages.slice(0, 10) : undefined
    })
  } catch (error) {
    console.error('Error importing customers:', error)
    return NextResponse.json({ error: 'Failed to import customers' }, { status: 500 })
  }
}

// Parse CSV line handling quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}
