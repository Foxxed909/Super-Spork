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
  });
}

export async function PATCH(req: NextRequest) {
  if (!hasClerkServerKeys()) {
    return new NextResponse("Clerk is not configured for this local run", { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { customInstructions } = await req.json();

  if (typeof customInstructions === "string" && customInstructions.length > 2000) {
    return new NextResponse("customInstructions must be 2000 characters or fewer", { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      customInstructions:
        typeof customInstructions === "string" && customInstructions.trim()
          ? customInstructions.trim()
          : null,
    },
  });

  return new NextResponse(null, { status: 204 });
}
