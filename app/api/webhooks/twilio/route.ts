import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processInboundMessage } from "@/lib/sms-queue";

// POST /api/webhooks/twilio - Handle Twilio webhooks
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;
    const messageStatus = formData.get("MessageStatus") as string;

    // Handle status callbacks
    if (messageStatus && messageSid) {
      await prisma.reminderMessage.updateMany({
        where: { twilioSid: messageSid },
        data: {
          status: mapTwilioStatus(messageStatus),
          statusUpdatedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    // Handle inbound messages
    if (from && body) {
      await processInboundMessage({
        from,
        to,
        body,
        messageSid,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error handling Twilio webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function mapTwilioStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "queued": "queued",
    "sent": "sent",
    "delivered": "delivered",
    "failed": "failed",
    "undelivered": "undelivered",
  };
  return statusMap[status] || "sent";
}
