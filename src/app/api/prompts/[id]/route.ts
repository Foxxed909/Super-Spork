import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  const user = await getOrCreateUser(userId);

  const prompt = await db.savedPrompt.findUnique({ where: { id } });
  if (!prompt) return new NextResponse("Not found", { status: 404 });

  // Only allow incrementing uses if prompt is public OR the user owns it
  if (!prompt.isPublic && prompt.userId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  await db.savedPrompt
    .update({
      where: { id },
      data: { uses: { increment: 1 } },
    })
    .catch(() => {});

  return new NextResponse(null, { status: 204 });
}
