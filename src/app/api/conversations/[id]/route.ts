import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await getOrCreateUser(userId);

  const body = await req.json();
  const { title, folderId } = body;

  if (title !== undefined) {
    if (typeof title !== "string" || !title.trim()) {
      return new NextResponse("Title required", { status: 400 });
    }
  }

  if (folderId !== undefined && folderId !== null) {
    const folder = await db.folder.findFirst({ where: { id: folderId, userId: user.id } });
    if (!folder) return new NextResponse("Folder not found", { status: 404 });
  }

  const updated = await db.conversation.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(folderId !== undefined ? { folderId: folderId ?? null } : {}),
    },
  });

  if (updated.count === 0) return new NextResponse("Not found", { status: 404 });

  const conversation = await db.conversation.findFirst({
    where: { id },
    select: { id: true, title: true, folderId: true },
  });

  return NextResponse.json(conversation);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await getOrCreateUser(userId);

  await db.conversation.deleteMany({ where: { id, userId: user.id } });

  return new NextResponse(null, { status: 204 });
}
