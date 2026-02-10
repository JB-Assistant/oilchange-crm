import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/service-types/[id] - Update service type
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const serviceType = await prisma.serviceType.update({
      where: { id: params.id, orgId },
      data: body,
    });

    return NextResponse.json(serviceType);
  } catch (error) {
    console.error("Error updating service type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/service-types/[id] - Delete service type
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.serviceType.delete({
      where: { id: params.id, orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
