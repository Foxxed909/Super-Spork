import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const { id } = await params;

  const token = await db.apiToken.findFirst({
    where: { id, userId: user.id },
  });
  if (!token) return new NextResponse("Not found", { status: 404 });

  await db.apiToken.update({
    where: { id },
    data: { isActive: false },
  });

  return new NextResponse(null, { status: 204 });
