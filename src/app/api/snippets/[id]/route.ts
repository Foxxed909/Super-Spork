import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const user = await getOrCreateUser(userId);

  await db.snippet.deleteMany({ where: { id, userId: user.id } });

  return new NextResponse(null, { status: 204 });
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
  const { title, content, lang } = body;

  const updated = await db.snippet.updateMany({
    where: { id, userId: user.id },
    data: {
      ...(typeof title === "string" && title.trim() ? { title: title.trim().slice(0, 100) } : {}),
      ...(typeof content === "string" && content.trim() ? { content: content.trim().slice(0, 20000) } : {}),
      ...(lang !== undefined ? { lang: typeof lang === "string" && lang.trim() ? lang.trim() : null } : {}),
    },
  });

  if (updated.count === 0) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(null, { status: 204 });
}
