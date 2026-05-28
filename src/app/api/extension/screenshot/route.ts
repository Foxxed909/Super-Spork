import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-helper";

// In-memory store with 5-min TTL — suitable for serverless edge context
const screenshotStore = new Map<string, { dataUrl: string; expiresAt: number }>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, val] of screenshotStore) {
    if (val.expiresAt < now) screenshotStore.delete(key);
  }
}

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { dataUrl } = await req.json();
  if (!dataUrl || typeof dataUrl !== "string") {
    return new NextResponse("dataUrl is required", { status: 400 });
  }

  pruneExpired();

  const contextId = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  screenshotStore.set(contextId, {
    dataUrl,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 min TTL
  });

  return NextResponse.json({
    contextId,
    extractedText: "Screenshot captured and ready for context.",
  });
}
