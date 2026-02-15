import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ensureOrganization } from "@/lib/ensure-org"

const VALID_TONES = ["friendly", "professional", "casual"] as const

export async function GET() {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await ensureOrganization(orgId)

    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        aiPersonalization: true,
        aiTone: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    return NextResponse.json({
      aiPersonalization: org.aiPersonalization,
      aiTone: org.aiTone,
    })
  } catch (error) {
    console.error("Error fetching AI settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { aiPersonalization, aiTone } = await req.json()

    if (typeof aiPersonalization !== "boolean") {
      return NextResponse.json({ error: "aiPersonalization must be a boolean" }, { status: 400 })
    }

    if (aiTone && !VALID_TONES.includes(aiTone)) {
      return NextResponse.json(
        { error: `aiTone must be one of: ${VALID_TONES.join(", ")}` },
        { status: 400 },
      )
    }

    await ensureOrganization(orgId)

    await prisma.organization.update({
      where: { clerkOrgId: orgId },
      data: {
        aiPersonalization,
        ...(aiTone ? { aiTone } : {}),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving AI settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
