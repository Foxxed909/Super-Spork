import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

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
}
