import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { id } = await params;
  const body = await req.json();

  const folder = await db.folder.findFirst({ where: { id, userId: user.id } });
  if (!folder) return new NextResponse("Not found", { status: 404 });

  // If assigning a conversation to this folder
  if (body.conversationId) {
    await db.conversation.updateMany({
      where: { id: body.conversationId, userId: user.id },
      data: { folderId: id },
    });
    return new NextResponse(null, { status: 204 });
  }

  const updated = await db.folder.update({
    where: { id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.emoji !== undefined ? { emoji: body.emoji } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { id } = await params;

  const folder = await db.folder.findFirst({ where: { id, userId: user.id } });
  if (!folder) return new NextResponse("Not found", { status: 404 });

  // Un-assign conversations before deleting folder
  await db.conversation.updateMany({
    where: { folderId: id },
    data: { folderId: null },
  });

  await db.folder.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
