import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";

// GET /api/twilio-config - Get Twilio config for org
export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.twilioConfig.findUnique({
      where: { orgId },
    });

    if (!config) {
      return NextResponse.json(null);
    }

    // Decrypt accountSid for display, don't return auth token
    const displaySid = isEncrypted(config.accountSid)
      ? decrypt(config.accountSid)
      : config.accountSid;

    return NextResponse.json({
      id: config.id,
      accountSid: displaySid,
      phoneNumber: config.phoneNumber,
      isActive: config.isActive,
    });
  } catch (error) {
    console.error("Error fetching Twilio config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/twilio-config - Save Twilio config
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountSid, authToken, phoneNumber } = await req.json();

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { error: "Account SID, Auth Token, and Phone Number are required" },
        { status: 400 }
      );
    }

    const encryptedSid = encrypt(accountSid);
    const encryptedToken = encrypt(authToken);

    const config = await prisma.twilioConfig.upsert({
      where: { orgId },
      update: {
        accountSid: encryptedSid,
        authToken: encryptedToken,
        phoneNumber,
        isActive: true,
      },
      create: {
        orgId,
        accountSid: encryptedSid,
        authToken: encryptedToken,
        phoneNumber,
        isActive: true,
      },
    });

    return NextResponse.json({
      id: config.id,
      accountSid: config.accountSid,
      phoneNumber: config.phoneNumber,
      isActive: config.isActive,
    });
  } catch (error) {
    console.error("Error saving Twilio config:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
