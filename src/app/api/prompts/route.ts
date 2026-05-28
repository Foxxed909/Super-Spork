import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope") ?? "public";

  if (scope === "mine") {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    const user = await getOrCreateUser(userId);

    const prompts = await db.savedPrompt.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(prompts);
  }

  // Public prompts
  const prompts = await db.savedPrompt.findMany({
    where: { isPublic: true },
    orderBy: [{ uses: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { user: { select: { username: true, email: true } } },
  });

  return NextResponse.json(prompts);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { title, content, isPublic } = await req.json();
  if (
    typeof title !== "string" || !title.trim() ||
    typeof content !== "string" || !content.trim()
  ) {
    return new NextResponse("Missing fields", { status: 400 });
  }

  const prompt = await db.savedPrompt.create({
    data: {
      userId: user.id,
      title: title.trim(),
      content: content.trim(),
      isPublic: Boolean(isPublic),
    },
  });

  return NextResponse.json(prompt, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await req.json();
  if (typeof id !== "string") return new NextResponse("Missing id", { status: 400 });

  const user = await getOrCreateUser(userId);

  await db.savedPrompt.deleteMany({ where: { id, userId: user.id } });

  return new NextResponse(null, { status: 204 });
