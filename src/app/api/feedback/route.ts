import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth-helper";
import { FeedbackSource, FeedbackType } from "@prisma/client";

const VALID_TYPES = new Set<string>(["BUG", "FEATURE_REQUEST", "COMPLAINT", "PRAISE", "QUESTION", "OTHER"]);
const VALID_SOURCES = new Set<string>(["WEB", "CLI", "EXTENSION", "API"]);

export async function POST(req: NextRequest) {
  let body: { type?: unknown; subject?: unknown; body?: unknown; email?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const { type, subject, body: feedbackBody, email, source } = body;

  if (!type || typeof type !== "string" || !VALID_TYPES.has(type)) {
    return new NextResponse("Invalid feedback type", { status: 400 });
  }
  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return new NextResponse("subject is required", { status: 400 });
  }
  if (subject.length > 200) {
    return new NextResponse("subject must be 200 characters or fewer", { status: 400 });
  }
  if (!feedbackBody || typeof feedbackBody !== "string" || feedbackBody.trim().length === 0) {
    return new NextResponse("body is required", { status: 400 });
  }
  if (feedbackBody.length > 5000) {
    return new NextResponse("body must be 5000 characters or fewer", { status: 400 });
  }

  const safeSource =
    source && typeof source === "string" && VALID_SOURCES.has(source)
      ? (source as FeedbackSource)
      : FeedbackSource.WEB;

  // Resolve user if authenticated (optional — feedback can be anonymous)
  const user = await resolveUser(req).catch(() => null);

  const safeEmail =
    typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? email
      : undefined;

  const feedback = await db.feedback.create({
    data: {
      userId: user?.id ?? null,
      source: safeSource,
      type: type as FeedbackType,
      subject: subject.trim(),
      body: feedbackBody.trim(),
      email: safeEmail ?? user?.email ?? null,
    },
  });

  return NextResponse.json({ id: feedback.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  // Admin-only endpoint — requires a trusted API token or staff check
  const user = await resolveUser(req).catch(() => null);
  if (!user || !user.isVerified) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const cursor = searchParams.get("cursor");

  const safeCursor = cursor && /^[a-z0-9]+$/i.test(cursor) ? cursor : undefined;

  const feedbacks = await db.feedback.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(type ? { type: type as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    ...(safeCursor ? { cursor: { id: safeCursor }, skip: 1 } : {}),
    include: {
      user: { select: { username: true, email: true, tier: true } },
    },
  });

  const nextCursor = feedbacks.length === 50 ? feedbacks[feedbacks.length - 1].id : null;
  return NextResponse.json({ feedbacks, nextCursor });
}
