import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth-helper";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const profile = await db.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      location: true,
      link: true,
      isVerified: true,
      tier: true,
      createdAt: true,
      _count: {
        select: {
          followers: true,
          following: true,
          conversations: { where: { isPublic: true } },
          posts: { where: { isPublic: true } },
        },
      },
      badges: { select: { type: true, awardedAt: true } },
      conversations: {
        where: { isPublic: true },
        orderBy: { likes: "desc" },
        take: 6,
        select: { id: true, title: true, likes: true, views: true, createdAt: true, agentId: true },
      },
      posts: {
        where: { isPublic: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, content: true, type: true, likes: true, tags: true, createdAt: true, conversationId: true },
      },
    },
  });

  if (!profile) return new NextResponse("Not found", { status: 404 });

  // Check if the current user follows this profile
  const me = await resolveUser(req).catch(() => null);
  let isFollowing = false;
  if (me && me.id !== profile.id) {
    const follow = await db.follow.findUnique({
      where: { followerId_followingId: { followerId: me.id, followingId: profile.id } },
    });
    isFollowing = !!follow;
  }

  return NextResponse.json({ ...profile, isFollowing, isMe: me?.id === profile.id });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const me = await resolveUser(req);
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const { username } = await params;
  if (me.username !== username) return new NextResponse("Forbidden", { status: 403 });

  const { displayName, bio, avatarUrl, location, link, newUsername } = await req.json();

  if (newUsername && typeof newUsername === "string") {
    // Validate: 3-30 chars, lowercase alphanumeric + underscores only
    if (!/^[a-z0-9_]{3,30}$/.test(newUsername)) {
      return new NextResponse("Username must be 3-30 chars: lowercase letters, numbers, underscores only", { status: 400 });
    }
    const taken = await db.user.findUnique({ where: { username: newUsername } });
    if (taken && taken.id !== me.id) {
      return new NextResponse("Username already taken", { status: 409 });
    }
  }

  if (bio && bio.length > 500) {
    return new NextResponse("Bio must be 500 characters or fewer", { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: me.id },
    data: {
      ...(newUsername ? { username: newUsername } : {}),
      ...(displayName !== undefined ? { displayName: displayName?.trim() || null } : {}),
      ...(bio !== undefined ? { bio: bio?.trim() || null } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl?.trim() || null } : {}),
      ...(location !== undefined ? { location: location?.trim() || null } : {}),
      ...(link !== undefined ? { link: link?.trim() || null } : {}),
    },
    select: { username: true, displayName: true, bio: true, avatarUrl: true, location: true, link: true },
  });

  return NextResponse.json(updated);
}
