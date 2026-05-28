import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Tier } from "@prisma/client";

// Map Stripe price IDs to our Tier enum — set via environment variables so
// values can be updated without redeploying.
function resolveTierFromPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null;
  const map: Record<string, Tier> = {
    [process.env.STRIPE_PRICE_LITE ?? ""]: Tier.SPORK_LITE,
    [process.env.STRIPE_PRICE_PRO ?? ""]: Tier.SPORK_PRO,
    [process.env.STRIPE_PRICE_SUPER ?? ""]: Tier.SUPER_SPORK,
    [process.env.STRIPE_PRICE_ULTRA ?? ""]: Tier.SPORK_ULTRA,
    [process.env.STRIPE_PRICE_INFINITY ?? ""]: Tier.SPORK_INFINITY,
    [process.env.STRIPE_PRICE_GODMODE ?? ""]: Tier.SPORK_GODMODE,
  };
  return map[priceId] ?? null;
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return new NextResponse("Stripe not configured", { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const body = await req.text();
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const clerkId = session.metadata?.clerkId;
    if (!clerkId) return NextResponse.json({ received: true });

    // Resolve tier from the subscription's price, not user-controlled metadata
    let tier: Tier = Tier.SUPER_SPORK;
    if (session.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id;
        tier = resolveTierFromPriceId(priceId) ?? Tier.SUPER_SPORK;
      } catch {}
    }

    await db.user.update({ where: { clerkId }, data: { tier } }).catch(() => {});
  }

  if (
    event.type === "customer.subscription.deleted" ||
    event.type === "customer.subscription.paused"
  ) {
    const subscription = event.data.object as Stripe.Subscription;
    const clerkId = subscription.metadata?.clerkId;
    if (clerkId) {
      await db.user.update({ where: { clerkId }, data: { tier: Tier.FREE } }).catch(() => {});
    }
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const clerkId = subscription.metadata?.clerkId;
    if (!clerkId) return NextResponse.json({ received: true });

    const priceId = subscription.items.data[0]?.price.id;
    const tier = resolveTierFromPriceId(priceId);
    if (tier) {
      await db.user.update({ where: { clerkId }, data: { tier } }).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
