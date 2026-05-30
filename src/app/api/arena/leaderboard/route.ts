import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { atLeastSuperSpork } from "@/lib/tier";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET() {
  if (!hasClerkServerKeys()) {
    return new NextResponse("Clerk is not configured for this local run", { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);
  if (!atLeastSuperSpork(user.tier)) {
    return new NextResponse("Super Spork required", { status: 403 });
  }

  const votes = await db.arenaVote.findMany({
    select: { winnerId: true, loserId: true },
  });

  const stats: Record<string, { wins: number; losses: number }> = {};

  for (const vote of votes) {
    if (vote.winnerId !== "tie") {
      if (!stats[vote.winnerId]) stats[vote.winnerId] = { wins: 0, losses: 0 };
      stats[vote.winnerId].wins++;
    }
    if (vote.loserId !== "tie") {
      if (!stats[vote.loserId]) stats[vote.loserId] = { wins: 0, losses: 0 };
      stats[vote.loserId].losses++;
    }
  }

  const leaderboard = Object.entries(stats)
    .map(([modelId, { wins, losses }]) => {
      const total = wins + losses;
      const winRate = total > 0 ? wins / total : 0;
      return { modelId, wins, losses, total, winRate };
    })
    .sort((a, b) => b.winRate - a.winRate || b.total - a.total);

  return NextResponse.json(leaderboard);
}
