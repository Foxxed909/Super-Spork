import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { atLeastSuperSpork } from "@/lib/tier";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET() {
  if (!hasClerkServerKeys()) {
    return NextResponse.json([]);
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  if (!atLeastSuperSpork(user.tier)) {
    return new NextResponse("Super Spork required", { status: 403 });
  }

  const votes = await db.arenaVote.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      winnerId: true,
      loserId: true,
      prompt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(votes);
}
