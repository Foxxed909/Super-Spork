import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await getOrCreateUser(userId);

  const conversation = await db.conversation.findFirst({
    where: { id, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!conversation) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(conversation);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await getOrCreateUser(userId);

  await db.conversation.deleteMany({ where: { id, userId: user.id } });

  return new NextResponse(null, { status: 204 });
