import { prisma } from "./prisma";
import { sendSMS } from "./twilio";

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendQueuedMessages(): Promise<SendResult> {
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get messages queued for sending (scheduled in the past)
    const messages = await prisma.reminderMessage.findMany({
      where: {
        status: "queued",
        scheduledAt: {
          lte: new Date(),
        },
      },
      take: 100, // Batch size
      include: {
        customer: true,
        organization: true,
      },
    });

    for (const message of messages) {
      try {
        // Check quiet hours (handle wrap-around like 21-9 vs non-wrap like 9-17)
        const hour = new Date().getHours();
        const qStart = message.organization.reminderQuietStart;
        const qEnd = message.organization.reminderQuietEnd;
        const isQuietHours = qStart > qEnd
          ? hour >= qStart || hour < qEnd
          : hour >= qStart && hour < qEnd;

        if (isQuietHours) {
          skipped++;
          continue;
        }

        // Send via Twilio
        await sendSMS({
          to: message.customer.phone,
          body: message.body,
          orgId: message.orgId,
          customerId: message.customerId,
          vehicleId: message.vehicleId || undefined,
          serviceRecordId: message.serviceRecordId || undefined,
          reminderMessageId: message.id,
        });

        sent++;
      } catch (error) {
        console.error(`Failed to send message ${message.id}:`, error);
        
        // Update status to failed
        await prisma.reminderMessage.update({
          where: { id: message.id },
          data: {
            status: "failed",
            statusUpdatedAt: new Date(),
          },
        });

        failed++;
      }
    }

    return { sent, failed, skipped };
  } catch (error) {
    console.error("Error in sendQueuedMessages:", error);
    return { sent, failed, skipped };
  }
}

interface InboundMessage {
  from: string;
  to: string;
  body: string;
  messageSid: string;
}

export async function processInboundMessage({
  from,
  to,
  body,
  messageSid,
}: InboundMessage) {
  try {
    // Find customer by phone
    const customer = await prisma.customer.findFirst({
      where: { phone: from },
      include: { organization: true },
    });

    if (!customer) {
      console.log(`No customer found for phone: ${from}`);
      return;
    }

    const org = customer.organization;
    const messageBody = body.toUpperCase().trim();

    // Store all inbound messages before keyword branching
    await prisma.reminderMessage.create({
      data: {
        orgId: org.clerkOrgId,
        customerId: customer.id,
        direction: "inbound",
        body,
        fromPhone: from,
        toPhone: to,
        twilioSid: messageSid,
        status: "delivered",
        statusUpdatedAt: new Date(),
        scheduledAt: new Date(),
      },
    });

    // Handle STOP
    if (messageBody === "STOP" || messageBody.startsWith("STOP")) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          smsConsent: false,
          smsConsentDate: new Date(),
        },
      });

      await prisma.consentLog.create({
        data: {
          orgId: org.clerkOrgId,
          customerId: customer.id,
          action: "opt_out",
          source: "sms_reply",
          performedBy: "system",
        },
      });

      // Send confirmation
      await sendSMS({
        to: from,
        body: `You have been unsubscribed from ${org.name} reminders. Reply START to re-subscribe.`,
        orgId: org.clerkOrgId,
      });

      return;
    }

    // Handle START
    if (messageBody === "START") {
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          smsConsent: true,
          smsConsentDate: new Date(),
        },
      });

      await prisma.consentLog.create({
        data: {
          orgId: org.clerkOrgId,
          customerId: customer.id,
          action: "opt_in",
          source: "sms_reply",
          performedBy: "system",
        },
      });

      await sendSMS({
        to: from,
        body: `You are now subscribed to ${org.name} reminders. You'll receive notifications for upcoming services.`,
        orgId: org.clerkOrgId,
      });

      return;
    }

    // Handle BOOK
    if (messageBody === "BOOK") {
      // Find the most recent outbound reminder to link the follow-up
      const recentReminder = await prisma.reminderMessage.findFirst({
        where: {
          customerId: customer.id,
          direction: "outbound",
          serviceRecordId: { not: null },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentReminder?.serviceRecordId) {
        await prisma.followUpRecord.create({
          data: {
            customerId: customer.id,
            serviceRecordId: recentReminder.serviceRecordId,
            orgId: org.clerkOrgId,
            method: "text",
            outcome: "scheduled",
            notes: "Customer replied BOOK to schedule via SMS",
          },
        });
      }

      await sendSMS({
        to: from,
        body: `Thanks! We'll call you shortly to schedule your appointment.`,
        orgId: org.clerkOrgId,
      });

      return;
    }

    // Log other replies as follow-up notes
    const recentMessage = await prisma.reminderMessage.findFirst({
      where: {
        customerId: customer.id,
        direction: "outbound",
        serviceRecordId: { not: null },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentMessage?.serviceRecordId) {
      await prisma.followUpRecord.create({
        data: {
          customerId: customer.id,
          serviceRecordId: recentMessage.serviceRecordId,
          orgId: org.clerkOrgId,
          method: "text",
          outcome: "no_response",
          notes: `Customer reply: ${body}`,
        },
      });
    }
  } catch (error) {
    console.error("Error processing inbound message:", error);
  }
}
