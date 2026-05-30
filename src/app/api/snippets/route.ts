import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";
import { hasClerkServerKeys } from "@/lib/clerk-server";

export async function GET() {
  if (!hasClerkServerKeys()) return NextResponse.json([]);

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const snippets = await db.snippet.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(snippets);
}

export async function POST(req: NextRequest) {
  if (!hasClerkServerKeys()) return new NextResponse("Clerk not configured", { status: 503 });

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const user = await getOrCreateUser(userId);

  const body = await req.json();
  const { title, content, lang } = body;

  if (typeof title !== "string" || !title.trim())
    return new NextResponse("title required", { status: 400 });
  if (typeof content !== "string" || !content.trim())
    return new NextResponse("content required", { status: 400 });

  const snippet = await db.snippet.create({
    data: {
      userId: user.id,
      title: title.trim().slice(0, 100),
      content: content.trim().slice(0, 20000),
      lang: typeof lang === "string" && lang.trim() ? lang.trim().slice(0, 30) : null,
    },
  });

  return NextResponse.json(snippet, { status: 201 });
}
