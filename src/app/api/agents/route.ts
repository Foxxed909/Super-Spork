import { NextRequest, NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";
import { resolveUser } from "@/lib/auth-helper";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const builtIn = AGENTS.map(({ id, name, emoji, tagline, tier }) => ({
    id,
    name,
    emoji,
    tagline,
    tier,
    type: "builtin" as const,
  }));

  // Optionally append custom agents for authed users
  const user = await resolveUser(req).catch(() => null);
  if (user) {
    const custom = await db.customAgent.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, emoji: true, tagline: true, isPublic: true },
    });
    const customMapped = custom.map((a) => ({
      id: `custom_${a.id}`,
      name: a.name,
      emoji: a.emoji ?? "🤖",
      tagline: a.tagline ?? "",
      tier: "custom" as const,
      type: "custom" as const,
    }));
    return NextResponse.json([...builtIn, ...customMapped]);
  }

  return NextResponse.json(builtIn);
}
