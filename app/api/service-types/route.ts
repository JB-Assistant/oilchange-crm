import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createServiceTypeSchema } from "@/lib/validations"
import { ZodError } from "zod"

export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const serviceTypes = await prisma.serviceType.findMany({
      where: { orgId, isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { displayName: "asc" }],
    })

    return NextResponse.json(serviceTypes)
  } catch (error) {
    console.error("Error fetching service types:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = createServiceTypeSchema.parse(body)

    const serviceType = await prisma.serviceType.create({
      data: {
        orgId,
        name: data.name,
        displayName: data.displayName,
        category: data.category ?? 'general',
        description: data.description ?? null,
        defaultMileageInterval: data.defaultMileageInterval ?? null,
        defaultTimeIntervalDays: data.defaultTimeIntervalDays ?? null,
        reminderLeadDays: data.reminderLeadDays,
        isCustom: true,
      },
    })

    return NextResponse.json(serviceType, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("Error creating service type:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
