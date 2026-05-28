import { NextResponse } from "next/server";
import { FREE_MODELS, PAID_MODELS } from "@/lib/models";

export async function GET() {
  return NextResponse.json([...FREE_MODELS, ...PAID_MODELS]);
}
