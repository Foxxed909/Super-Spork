import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const TIER_PRICE_MAP: Record<string, string | undefined> = {
  SPORK_LITE: process.env.STRIPE_PRICE_LITE,
  SPORK_PRO: process.env.STRIPE_PRICE_PRO,
  SUPER_SPORK: process.env.STRIPE_PRICE_SUPER,
  SPORK_ULTRA: process.env.STRIPE_PRICE_ULTRA,
  SPORK_INFINITY: process.env.STRIPE_PRICE_INFINITY,
  SPORK_GODMODE: process.env.STRIPE_PRICE_GODMODE,
};

const PAID_TIERS = new Set(Object.keys(TIER_PRICE_MAP));

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let tier: string = "SUPER_SPORK";
  try {
    const body = await req.json();
    if (body.tier && typeof body.tier === "string" && PAID_TIERS.has(body.tier)) {
      tier = body.tier;
    }
  } catch {}

  const priceId = TIER_PRICE_MAP[tier];
  if (!priceId) {
    return new NextResponse(`No Stripe price configured for tier: ${tier}`, { status: 500 });
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { clerkId: userId, tier },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
