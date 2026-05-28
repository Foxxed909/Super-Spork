import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { username } = await params;

  const [me, target] = await Promise.all([
    getOrCreateUser(userId),
    db.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (!target) return new NextResponse("Target not found", { status: 404 });
  if (me.id === target.id) return new NextResponse("Cannot follow yourself", { status: 400 });

  await db.follow.upsert({
    where: { followerId_followingId: { followerId: me.id, followingId: target.id } },
    update: {},
    create: { followerId: me.id, followingId: target.id },
  });

  return NextResponse.json({ following: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { username } = await params;

  const [me, target] = await Promise.all([
    getOrCreateUser(userId),
    db.user.findUnique({ where: { username }, select: { id: true } }),
  ]);
  if (!target) return new NextResponse("Not found", { status: 404 });

  await db.follow.deleteMany({
    where: { followerId: me.id, followingId: target.id },
  });

  return NextResponse.json({ following: false });
}
