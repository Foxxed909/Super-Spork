import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function resolveUser(req: NextRequest) {
  // 1. Clerk session (web UI)
  const { userId } = await auth();
  if (userId) return db.user.findUnique({ where: { clerkId: userId } });

  // 2. Bearer token (extension / CLI / MCP)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const raw = authHeader.slice(7);
  if (!raw) return null;
  const hash = sha256(raw);
  const tok = await db.apiToken.findUnique({
    where: { tokenHash: hash },
    include: { user: true },
  });
  if (!tok?.isActive) return null;
  // fire-and-forget lastUsedAt update
  db.apiToken
    .update({ where: { id: tok.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return tok.user;
}
