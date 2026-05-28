import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-helper";
import { db } from "@/lib/db";
import { canUseModel } from "@/lib/tier";
import { FREE_MODELS } from "@/lib/models";

export async function POST(req: NextRequest) {
  const user = await resolveUser(req);
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { title, url, text, model } = await req.json();
  if (!title || !url || !text) {
    return new NextResponse("title, url, and text are required", { status: 400 });
  }

  const defaultModel = FREE_MODELS[0].id;
  const selectedModel =
    model && canUseModel(user.tier, model) ? model : defaultModel;

  const conversation = await db.conversation.create({
    data: {
      userId: user.id,
      title: `📎 ${String(title).slice(0, 55)}`,
      model: selectedModel,
      messages: {
        create: {
          role: "system",
          content: `Clipped page: "${title}"\nURL: ${url}\n\n${String(text).slice(0, 8000)}`,
        },
      },
    },
    select: { id: true, title: true, createdAt: true },
  });

  return NextResponse.json(conversation, { status: 201 });
}
