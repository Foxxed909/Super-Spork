import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth-helper";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const post = await db.post.findUnique({ where: { id, isPublic: true } });
  if (!post) return new NextResponse("Not found", { status: 404 });

  const existing = await db.postLike.findUnique({
    where: { userId_postId: { userId: user.id, postId: id } },
  });

  if (existing) {
    return NextResponse.json({ liked: true, likes: post.likes }, { status: 200 });
  }

  const [, updated] = await db.$transaction([
    db.postLike.create({ data: { userId: user.id, postId: id } }),
    db.post.update({ where: { id }, data: { likes: { increment: 1 } } }),
  ]);

  return NextResponse.json({ liked: true, likes: updated.likes }, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const existing = await db.postLike.findUnique({
    where: { userId_postId: { userId: user.id, postId: id } },
  });

  if (!existing) {
    return NextResponse.json({ liked: false });
  }

  await db.$transaction([
    db.postLike.delete({ where: { userId_postId: { userId: user.id, postId: id } } }),
    db.post.update({ where: { id }, data: { likes: { decrement: 1 } } }),
  ]);

  return NextResponse.json({ liked: false });
}
