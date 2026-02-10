import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/service-types - List service types for org
export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceTypes = await prisma.serviceType.findMany({
      where: { orgId },
      orderBy: { displayName: "asc" },
    });

    return NextResponse.json(serviceTypes);
  } catch (error) {
    console.error("Error fetching service types:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/service-types - Create new service type
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      displayName,
      defaultMileageInterval,
      defaultTimeIntervalDays,
      reminderLeadDays,
    } = body;

    if (!name || !displayName) {
      return NextResponse.json(
        { error: "Name and displayName are required" },
        { status: 400 }
      );
    }

    const serviceType = await prisma.serviceType.create({
      data: {
        orgId,
        name,
        displayName,
        defaultMileageInterval,
        defaultTimeIntervalDays,
        reminderLeadDays: reminderLeadDays || 14,
        isCustom: true,
      },
    });

    return NextResponse.json(serviceType, { status: 201 });
  } catch (error) {
    console.error("Error creating service type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
