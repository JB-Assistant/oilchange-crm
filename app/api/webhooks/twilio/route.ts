import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MessageStatus } from "@prisma/client";
import { processInboundMessage } from "@/lib/sms-queue";
import { validateRequest } from "twilio";
import { decrypt, isEncrypted } from "@/lib/crypto";

async function verifyTwilioSignature(
  req: NextRequest,
  params: Record<string, string>
): Promise<boolean> {
  const signature = req.headers.get("x-twilio-signature");
  if (!signature) return false;

  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
  if (!webhookUrl) return false;

  const url = `${webhookUrl}/api/webhooks/twilio`;

  // Look up auth token by the "To" phone (inbound) or find any active config
  const phoneNumber = params.To || params.From;
  const config = phoneNumber
    ? await prisma.twilioConfig.findFirst({
        where: { phoneNumber, isActive: true },
      })
    : null;

  if (!config) return false;

  const authToken = isEncrypted(config.authToken)
    ? decrypt(config.authToken)
    : config.authToken;

  return validateRequest(authToken, signature, url, params);
}

// POST /api/webhooks/twilio - Handle Twilio webhooks
export async function POST(req: NextRequest) {
  try {
    // Read raw body for signature verification, then parse as form data
    const rawBody = await req.text();
    const params: Record<string, string> = {};
    const urlParams = new URLSearchParams(rawBody);
    for (const [key, value] of urlParams.entries()) {
      params[key] = value;
    }

    // Verify Twilio signature
    const clonedReq = new NextRequest(req.url, {
      headers: req.headers,
    });
    const isValid = await verifyTwilioSignature(clonedReq, params);
    if (!isValid) {
      console.warn("Invalid Twilio webhook signature");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const from = params.From;
    const to = params.To;
    const body = params.Body;
    const messageSid = params.MessageSid;
    const messageStatus = params.MessageStatus;

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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function mapTwilioStatus(status: string): MessageStatus {
  const statusMap: Record<string, MessageStatus> = {
    queued: MessageStatus.queued,
    sent: MessageStatus.sent,
    delivered: MessageStatus.delivered,
    failed: MessageStatus.failed,
    undelivered: MessageStatus.undelivered,
  };
  return statusMap[status] || MessageStatus.sent;
}
