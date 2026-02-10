import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await auth()
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { enabled } = await req.json()

    await prisma.organization.update({
      where: { clerkOrgId: orgId },
      data: {
        reminderEnabled: enabled,
      },
    })

    return NextResponse.json({ success: true, enabled })
  } catch (error) {
    console.error("Error toggling reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
