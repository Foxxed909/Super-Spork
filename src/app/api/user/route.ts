import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FREE_DAILY_LIMIT } from "@/lib/models";
import { hasClerkServerKeys } from "@/lib/clerk-server";
import { getOrCreateUser } from "@/lib/user";

export async function GET() {
  if (!hasClerkServerKeys()) {
    return NextResponse.json({
      tier: "FREE",
      dailyMessages: 0,
      dailyLimit: FREE_DAILY_LIMIT,
      customInstructions: "",
    });
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const now = new Date();
  const isNewDay = now.toDateString() !== new Date(user.lastReset).toDateString();
  const effectiveDailyMessages = isNewDay ? 0 : user.dailyMessages;

  return NextResponse.json({
    tier: user.tier,
    dailyMessages: effectiveDailyMessages,
    dailyLimit: FREE_DAILY_LIMIT,
    customInstructions: user.customInstructions ?? "",
    hasOpenrouterKey: !!user.openrouterKey,
  });
}

export async function PATCH(req: NextRequest) {
  if (!hasClerkServerKeys()) {
    return new NextResponse("Clerk is not configured for this local run", { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const body = await req.json();
  const { customInstructions, openrouterKey } = body;

  if (typeof customInstructions === "string" && customInstructions.length > 2000) {
    return new NextResponse("customInstructions must be 2000 characters or fewer", { status: 400 });
  }

  if (typeof openrouterKey === "string" && openrouterKey.length > 200) {
    return new NextResponse("openrouterKey too long", { status: 400 });
  }

  const updateData: Record<string, string | null> = {};
  if (customInstructions !== undefined) {
    updateData.customInstructions =
      typeof customInstructions === "string" && customInstructions.trim()
        ? customInstructions.trim()
        : null;
  }
  if (openrouterKey !== undefined) {
    updateData.openrouterKey =
      typeof openrouterKey === "string" && openrouterKey.trim()
        ? openrouterKey.trim()
        : null;
  }

  await db.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return new NextResponse(null, { status: 204 });
}
