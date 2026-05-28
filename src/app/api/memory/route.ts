import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const memories = await db.userMemory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(memories);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { content, sourceConvId } = await req.json();
  if (typeof content !== "string" || !content.trim()) {
    return new NextResponse("Missing content", { status: 400 });
  }

  const memory = await db.userMemory.create({
    data: {
      userId: user.id,
      content: content.trim(),
      sourceConvId: sourceConvId ?? null,
    },
  });

  return NextResponse.json(memory, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await req.json();
  if (typeof id !== "string") return new NextResponse("Missing id", { status: 400 });

  const user = await getOrCreateUser(userId);

  await db.userMemory.deleteMany({ where: { id, userId: user.id } });

  return new NextResponse(null, { status: 204 });
