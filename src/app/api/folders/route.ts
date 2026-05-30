import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET() {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const folders = await db.folder.findMany({
    where: { userId: user.id },
    include: {
      conversations: { select: { id: true, title: true }, orderBy: { updatedAt: "desc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(folders);
}

export async function POST(req: NextRequest) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { name, emoji } = await req.json();
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return new NextResponse("Name is required", { status: 400 });
  }

  const folder = await db.folder.create({
    data: { userId: user.id, name: name.trim(), emoji },
  });

  return NextResponse.json(folder, { status: 201 });
}
