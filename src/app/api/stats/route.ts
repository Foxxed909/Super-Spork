import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET() {
  if (!hasClerkServerKeys()) return NextResponse.json({});

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    totalConversations,
    totalMessages,
    totalSnippets,
    totalMemories,
    recentConvs,
    modelUsage,
    totalWords,
  ] = await Promise.all([
    db.conversation.count({ where: { userId: user.id } }),
    db.message.count({ where: { conversation: { userId: user.id } } }),
    db.snippet.count({ where: { userId: user.id } }),
    db.userMemory.count({ where: { userId: user.id } }),
    // Conversations in last 30 days
    db.conversation.count({
      where: { userId: user.id, createdAt: { gte: thirtyDaysAgo } },
    }),
    // Model breakdown
    db.conversation.groupBy({
      by: ["model"],
      where: { userId: user.id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
    // Total words across all messages
    db.message.findMany({
      where: { conversation: { userId: user.id } },
      select: { content: true },
    }),
  ]);

  const wordCount = totalWords.reduce(
    (acc, m) => acc + m.content.split(/\s+/).filter(Boolean).length,
    0
  );

  return NextResponse.json({
    totalConversations,
    totalMessages,
    totalSnippets,
    totalMemories,
    recentConversations: recentConvs,
    topModels: modelUsage.map((m) => ({ model: m.model, count: m._count.id })),
    totalWords: wordCount,
    tier: user.tier,
    dailyMessages: user.dailyMessages,
  });
}
