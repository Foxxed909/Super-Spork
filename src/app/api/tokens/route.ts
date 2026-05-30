import { randomBytes, createHash } from "crypto";
import { getOrCreateUser } from "@/lib/user";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const tokens = await db.apiToken.findMany({
    where: {
      userId: user.id,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true, label: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

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
