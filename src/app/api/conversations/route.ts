import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canUseModel } from "@/lib/tier";
import { ALL_MODELS } from "@/lib/models";
import { hasClerkServerKeys } from "@/lib/clerk-server";
import { getOrCreateUser } from "@/lib/user";

const VALID_MODEL_IDS = new Set(ALL_MODELS.map((m) => m.id));

export async function GET() {
  if (!hasClerkServerKeys()) {
    return NextResponse.json([]);
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const conversations = await db.conversation.findMany({
    where: { userId: user.id },
    orderBy: [{ pinnedAt: "desc" }, { updatedAt: "desc" }],
    take: 50,
    select: { id: true, title: true, model: true, agentId: true, pinnedAt: true, updatedAt: true },
  });

  return NextResponse.json(conversations);
}

export async function POST(req: NextRequest) {
  if (!hasClerkServerKeys()) {
    return new NextResponse("Clerk is not configured for this local run", { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  let body: { model?: unknown; agentId?: unknown };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { model, agentId } = body;

  const safeModel =
    typeof model === "string" && VALID_MODEL_IDS.has(model)
      ? model
      : "openai/gpt-oss-120b:free";

  if (!canUseModel(user.tier, safeModel)) {
    return new NextResponse("Model requires a higher tier", { status: 403 });
  }

  const conversation = await db.conversation.create({
    data: {
      userId: user.id,
      model: safeModel,
      title: "New conversation",
      agentId: typeof agentId === "string" ? agentId : null,
    },
  });

  return NextResponse.json(conversation);
}
