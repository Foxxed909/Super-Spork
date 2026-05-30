import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { atLeastSuperSpork } from "@/lib/tier";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function POST(req: NextRequest) {
  if (!hasClerkServerKeys()) {
    return new NextResponse("Clerk is not configured for this local run", { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  if (!atLeastSuperSpork(user.tier)) {
    return new NextResponse("Super Spork required", { status: 403 });
  }

  const body = await req.json();
  const { winnerId, loserId, prompt } = body;

  if (
    typeof winnerId !== "string" || !winnerId ||
    typeof loserId !== "string" || !loserId ||
    typeof prompt !== "string" || !prompt
  ) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  await db.arenaVote.create({
    data: { userId: user.id, winnerId, loserId, prompt },
  });

  return new NextResponse(null, { status: 201 });
}
