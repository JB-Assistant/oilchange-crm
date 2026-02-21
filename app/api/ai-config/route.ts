import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, isEncrypted } from "@/lib/crypto";

const VALID_PROVIDERS = ["anthropic", "openai", "google"] as const;

function maskApiKey(apiKey: string): string {
  const raw = isEncrypted(apiKey) ? decrypt(apiKey) : apiKey;
  if (raw.length <= 4) return "****";
  return "****" + raw.slice(-4);
}

// GET /api/ai-config - Fetch AI config for org
export async function GET(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = await prisma.aiConfig.findUnique({
      where: { orgId },
    });

    if (!config) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      model: config.model,
      apiKey: maskApiKey(config.apiKey),
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching AI config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/ai-config - Create or update AI config
export async function POST(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { provider, model, apiKey } = await req.json();

    if (!provider || !VALID_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: "Provider must be one of: anthropic, openai, google" },
        { status: 400 }
      );
    }

    if (!model || typeof model !== "string" || model.trim() === "") {
      return NextResponse.json(
        { error: "Model is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.aiConfig.findUnique({
      where: { orgId },
    });

    const isUpdate = !!existing;
    const hasNewApiKey = apiKey && typeof apiKey === "string" && apiKey.trim() !== "";

    if (!isUpdate && !hasNewApiKey) {
      return NextResponse.json(
        { error: "API key is required" },
        { status: 400 }
      );
    }

    const encryptedKey = hasNewApiKey ? encrypt(apiKey.trim()) : undefined;

    const config = await prisma.aiConfig.upsert({
      where: { orgId },
      update: {
        provider,
        model: model.trim(),
        ...(encryptedKey ? { apiKey: encryptedKey } : {}),
      },
      create: {
        orgId,
        provider,
        model: model.trim(),
        apiKey: encryptedKey!,
      },
    });

    return NextResponse.json({
      id: config.id,
      provider: config.provider,
      model: config.model,
      apiKey: maskApiKey(config.apiKey),
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    console.error("Error saving AI config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-config - Remove AI config for org
export async function DELETE(req: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.aiConfig.delete({
      where: { orgId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting AI config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
