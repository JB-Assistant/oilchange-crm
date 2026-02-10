import { prisma } from "./prisma";
import { renderTemplate } from "./template-engine";

interface EvaluationResult {
  queued: number;
  errors: string[];
}

export async function evaluateReminders(org: any): Promise<EvaluationResult> {
  const queued = 0;
  const errors: string[] = [];

  try {
    // Get customers with upcoming services
    const customers = await prisma.customer.findMany({
      where: {
        orgId: org.clerkOrgId,
        smsConsent: true,
      },
      include: {
        vehicles: {
          include: {
            serviceRecords: {
              where: {
                nextDueDate: {
                  lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due within 30 days
                },
              },
              orderBy: {
                serviceDate: "desc",
              },
              take: 1,
            },
          },
        },
      },
    });

    // Check quiet hours
    const now = new Date();
    const hour = now.getHours();
    const isQuietHours = hour >= org.reminderQuietStart || hour < org.reminderQuietEnd;

    if (isQuietHours) {
      return { queued: 0, errors: ["Quiet hours - skipping evaluation"] };
    }

    // TODO: Implement full reminder evaluation logic
    // This is a simplified version - full implementation would:
    // 1. Check if reminder already sent for this service/sequence
    // 2. Calculate due date vs reminder rule offset
    // 3. Apply smart batching for multiple services
    // 4. Queue messages for sending

    return { queued, errors };
  } catch (error) {
    errors.push(String(error));
    return { queued, errors };
  }
}
