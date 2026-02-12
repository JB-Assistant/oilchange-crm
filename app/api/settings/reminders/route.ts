import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { seedOrgDefaults } from "@/lib/seed-defaults"

export async function GET() {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        reminderEnabled: true,
        reminderQuietStart: true,
        reminderQuietEnd: true,
      }
    })

    let serviceTypes = await prisma.serviceType.findMany({
      where: { orgId },
    })

    // Lazy-init defaults for existing orgs that predate seeding
    if (serviceTypes.length === 0) {
      await seedOrgDefaults(orgId)
      serviceTypes = await prisma.serviceType.findMany({
        where: { orgId },
      })
    }

    return NextResponse.json({
      settings: org ? {
        enabled: org.reminderEnabled,
        quietStart: org.reminderQuietStart,
        quietEnd: org.reminderQuietEnd,
      } : null,
      serviceTypes,
    })
  } catch (error) {
    console.error("Error fetching reminder settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { settings, serviceTypes } = await req.json()

    // Update organization settings
    await prisma.organization.update({
      where: { clerkOrgId: orgId },
      data: {
        reminderEnabled: settings.enabled,
        reminderQuietStart: settings.quietStart,
        reminderQuietEnd: settings.quietEnd,
      },
    })

    // Update service types
    for (const type of serviceTypes) {
      await prisma.serviceType.upsert({
        where: { 
          id: type.id || 'new',
        },
        update: {
          reminderLeadDays: type.reminderLeadDays,
        },
        create: {
          orgId,
          name: type.name,
          displayName: type.displayName,
          defaultMileageInterval: type.defaultMileageInterval,
          defaultTimeIntervalDays: type.defaultTimeIntervalDays,
          reminderLeadDays: type.reminderLeadDays,
          isActive: true,
          isCustom: false,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving reminder settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
