import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/consent/[customerId] - Get consent history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = await params;

    const logs = await prisma.consentLog.findMany({
      where: {
        customerId,
        orgId,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching consent logs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/consent/[customerId] - Toggle consent manually
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerId } = await params;
    const { action } = await req.json();

    if (!action || !["opt_in", "opt_out"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'opt_in' or 'opt_out'" },
        { status: 400 }
      );
    }

    // Update customer
    await prisma.customer.update({
      where: { id: customerId, orgId },
      data: {
        smsConsent: action === "opt_in",
        smsConsentDate: new Date(),
      },
    });

    // Log the consent change
    await prisma.consentLog.create({
      data: {
        orgId,
        customerId,
        action,
        source: "manual",
        performedBy: userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating consent:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
