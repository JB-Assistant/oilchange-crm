import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSMS } from "@/lib/twilio";

// POST /api/twilio-config/test - Send test SMS
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to } = await req.json();

    if (!to) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const config = await prisma.twilioConfig.findUnique({
      where: { orgId },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 400 }
      );
    }

    const message = await sendSMS({
      to,
      body: "This is a test message from OilChange Pro. Your SMS reminders are working!",
      orgId,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return NextResponse.json(
      { error: "Failed to send test message" },
      { status: 500 }
    );
  }
}
