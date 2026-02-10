import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { renderTemplate } from "@/lib/template-engine";

// POST /api/reminder-templates/preview - Preview template with sample data
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { body } = await req.json();

    if (!body) {
      return NextResponse.json(
        { error: "Template body is required" },
        { status: 400 }
      );
    }

    // Sample data for preview
    const sampleData = {
      firstName: "John",
      lastName: "Smith",
      serviceType: "oil change",
      dueDate: "March 15",
      vehicleYear: "2020",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      shopName: "ABC Auto Repair",
      shopPhone: "(555) 123-4567",
      lastServiceDate: "December 15",
    };

    const preview = renderTemplate(body, sampleData);

    return NextResponse.json({ preview, sampleData });
  } catch (error) {
    console.error("Error previewing template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
