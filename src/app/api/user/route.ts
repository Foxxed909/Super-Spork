import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { FREE_DAILY_LIMIT } from "@/lib/models";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

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
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

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
