import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAIMessage, isAIAvailable, type AIMessageContext, type OrgAiConfig } from "@/lib/ai-sms";
import { renderTemplate, DEFAULT_TEMPLATES } from "@/lib/template-engine";
import { decrypt, isEncrypted } from "@/lib/crypto";

interface PreviewBody {
  customerId?: string;
  tone?: AIMessageContext["tone"];
  sequenceNumber?: number;
}

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const daysBetween = (a: Date, b: Date) =>
  Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));

async function buildCustomerContext(
  customerId: string, orgId: string, body: PreviewBody,
  orgName: string, orgPhone: string, orgTone: string
): Promise<AIMessageContext | null> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, orgId },
    include: {
      vehicles: {
        include: { serviceRecords: { orderBy: { serviceDate: "desc" }, take: 1 } },
      },
    },
  });
  if (!customer) return null;

  const vehicle = customer.vehicles[0];
  const latest = vehicle?.serviceRecords[0];
  const now = new Date();
  const dueDate = latest?.nextDueDate ?? now;
  const daysOverdue = dueDate < now ? daysBetween(dueDate, now) : 0;

  return {
    customerFirstName: customer.firstName,
    shopName: orgName,
    shopPhone: orgPhone || "(555) 000-0000",
    serviceType: latest?.serviceType ?? "Oil Change",
    vehicleYear: vehicle?.year ?? 2020,
    vehicleMake: vehicle?.make ?? "Unknown",
    vehicleModel: vehicle?.model ?? "Vehicle",
    dueDate: fmtDate(dueDate),
    daysSinceLastService: latest ? daysBetween(latest.serviceDate, now) : 0,
    mileageAtLastService: latest?.mileageAtService ?? null,
    isOverdue: daysOverdue > 0,
    daysOverdue,
    tone: (body.tone ?? orgTone) as AIMessageContext["tone"],
    sequenceNumber: body.sequenceNumber ?? 1,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: PreviewBody = await req.json();
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { name: true, phone: true, aiTone: true },
    });
    const orgName = org?.name ?? "Your Shop";
    const orgPhone = org?.phone ?? "(555) 000-0000";
    const orgTone = org?.aiTone ?? "friendly";

    let context: AIMessageContext;
    if (body.customerId) {
      const real = await buildCustomerContext(
        body.customerId, orgId, body, orgName, orgPhone, orgTone
      );
      if (!real) {
        return NextResponse.json({ error: "Customer not found" }, { status: 404 });
      }
      context = real;
    } else {
      context = {
        customerFirstName: "Sarah", shopName: orgName, shopPhone: orgPhone,
        serviceType: "Oil Change (Synthetic)", vehicleYear: 2021,
        vehicleMake: "Toyota", vehicleModel: "Camry", dueDate: "Mar 15",
        daysSinceLastService: 175, mileageAtLastService: 42000,
        isOverdue: false, daysOverdue: 0,
        tone: (body.tone ?? orgTone) as AIMessageContext["tone"],
        sequenceNumber: body.sequenceNumber ?? 1,
      };
    }

    // Load org-level AI config
    let orgAiConfig: OrgAiConfig | undefined;
    const aiConfigRow = await prisma.aiConfig.findUnique({ where: { orgId } });
    if (aiConfigRow?.isActive) {
      const rawKey = isEncrypted(aiConfigRow.apiKey) ? decrypt(aiConfigRow.apiKey) : aiConfigRow.apiKey;
      orgAiConfig = { provider: aiConfigRow.provider, model: aiConfigRow.model, apiKey: rawKey };
    }

    const aiAvailable = isAIAvailable(orgAiConfig);
    console.log("AI Preview: orgAiConfig loaded:", orgAiConfig ? `provider=${orgAiConfig.provider}, model=${orgAiConfig.model}, keyLen=${orgAiConfig.apiKey.length}` : "none (using env fallback)");
    console.log("AI Preview: aiAvailable =", aiAvailable);

    const aiResult = aiAvailable
      ? await generateAIMessage(context, orgAiConfig)
      : { body: "", fallbackUsed: true };

    console.log("AI Preview: result =", { bodyLen: aiResult.body.length, fallbackUsed: aiResult.fallbackUsed });

    const staticMessage = renderTemplate(DEFAULT_TEMPLATES.twoWeeksBefore, {
      firstName: context.customerFirstName, shopName: context.shopName,
      shopPhone: context.shopPhone, serviceType: context.serviceType,
      vehicleYear: String(context.vehicleYear), vehicleMake: context.vehicleMake,
      vehicleModel: context.vehicleModel, dueDate: context.dueDate,
    });

    return NextResponse.json({ aiMessage: aiResult.body, staticMessage, aiAvailable });
  } catch (error) {
    console.error("Error generating AI SMS preview:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
