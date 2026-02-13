import twilio from "twilio";
import { prisma } from "./prisma";
import { decrypt, isEncrypted } from "./crypto";

interface SendSMSOptions {
  to: string;
  body: string;
  orgId: string;
  customerId?: string;
  vehicleId?: string;
  serviceRecordId?: string;
  reminderMessageId?: string;
}

export async function sendSMS({
  to,
  body,
  orgId,
  customerId,
  vehicleId,
  serviceRecordId,
  reminderMessageId,
}: SendSMSOptions) {
  const config = await prisma.twilioConfig.findUnique({
    where: { orgId },
  });

  if (!config || !config.isActive) {
    throw new Error("Twilio not configured for this organization");
  }

  const sid = isEncrypted(config.accountSid) ? decrypt(config.accountSid) : config.accountSid;
  const token = isEncrypted(config.authToken) ? decrypt(config.authToken) : config.authToken;
  const client = twilio(sid, token);

  const webhookUrl = process.env.TWILIO_WEBHOOK_URL;
  const message = await client.messages.create({
    body,
    from: config.phoneNumber,
    to,
    ...(webhookUrl && { statusCallback: `${webhookUrl}/api/webhooks/twilio` }),
  });

  // If this is a tracked reminder message, update it
  if (reminderMessageId) {
    await prisma.reminderMessage.update({
      where: { id: reminderMessageId },
      data: {
        twilioSid: message.sid,
        status: "sent",
        sentAt: new Date(),
      },
    });
  }

  return message;
}

export async function getTwilioClient(orgId: string) {
  const config = await prisma.twilioConfig.findUnique({
    where: { orgId },
  });

  if (!config || !config.isActive) {
    throw new Error("Twilio not configured for this organization");
  }

  const sid = isEncrypted(config.accountSid) ? decrypt(config.accountSid) : config.accountSid;
  const token = isEncrypted(config.authToken) ? decrypt(config.authToken) : config.authToken;
  return twilio(sid, token);
}
