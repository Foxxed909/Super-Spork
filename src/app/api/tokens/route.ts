import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomBytes, createHash } from "crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const tokens = await db.apiToken.findMany({
    where: { userId: user.id, isActive: true },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return new NextResponse("User not found", { status: 404 });

  const { label } = await req.json();
  if (!label || typeof label !== "string" || label.trim().length === 0) {
    return new NextResponse("Label is required", { status: 400 });
  }

  const rawToken = randomBytes(32).toString("hex"); // 64-char hex
  const tokenHash = sha256(rawToken);

  await db.apiToken.create({
    data: {
      userId: user.id,
      label: label.trim(),
      tokenHash,
    },
  });

  // Return raw token ONCE — not stored, only the hash is kept
  return NextResponse.json({ token: rawToken, label: label.trim() }, { status: 201 });
}
