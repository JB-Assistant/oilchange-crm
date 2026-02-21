import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateReminders } from "@/lib/reminder-engine";

// POST /api/cron/process-reminders - Daily cron to evaluate and queue reminders
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all orgs with reminders enabled
    const orgs = await prisma.organization.findMany({
      where: { reminderEnabled: true },
      include: {
        serviceTypes: {
          where: { isActive: true },
          include: {
            reminderRules: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    const results = [];

    for (const org of orgs) {
      const result = await evaluateReminders(org);
      results.push({
        orgId: org.id,
        orgName: org.name,
        remindersQueued: result.queued,
        aiGenerated: result.aiGenerated,
        errors: result.errors,
      });
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error processing reminders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
