import { NextRequest, NextResponse } from "next/server";
import { sendQueuedMessages } from "@/lib/sms-queue";

// POST /api/cron/send-queued - Hourly cron to send queued messages
export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await sendQueuedMessages();

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
    });
  } catch (error) {
    console.error("Error sending queued messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
