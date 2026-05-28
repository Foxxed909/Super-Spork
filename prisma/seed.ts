/**
 * Spork Dev Seed Script
 *
 * Creates test accounts for every tier + the official @spork and agent profiles.
 * Run: npx ts-node prisma/seed.ts  (or: npx prisma db seed)
 *
 * NOTE: These are DB-only records. They need matching Clerk users to log in.
 * For local testing, create Clerk users with these emails first, then run seed.
 * The clerkId field uses a placeholder — update it after creating Clerk users.
 */

import { PrismaClient, Tier, BadgeType } from "@prisma/client";

const db = new PrismaClient();

// ---------------------------------------------------------------------------
// Test accounts: one per tier + a Spork official account
// ---------------------------------------------------------------------------
const TEST_ACCOUNTS = [
  {
    email: "free@spork.dev",
    username: "spork_free_tester",
    displayName: "Free Tester",
    tier: Tier.FREE,
    bio: "Official test account for the Free tier.",
    clerkId: "clerk_seed_free",
  },
  {
    email: "lite@spork.dev",
    username: "spork_lite_tester",
    displayName: "Lite Tester",
    tier: Tier.SPORK_LITE,
    bio: "Official test account for Spork Lite ($5/mo).",
    clerkId: "clerk_seed_lite",
  },
  {
    email: "pro@spork.dev",
    username: "spork_pro_tester",
    displayName: "Pro Tester",
    tier: Tier.SPORK_PRO,
    bio: "Official test account for Spork Pro ($12/mo).",
    clerkId: "clerk_seed_pro",
  },
  {
    email: "super@spork.dev",
    username: "spork_super_tester",
    displayName: "Super Tester",
    tier: Tier.SUPER_SPORK,
    bio: "Official test account for Super Spork ($20/mo).",
    clerkId: "clerk_seed_super",
  },
  {
    email: "ultra@spork.dev",
    username: "spork_ultra_tester",
    displayName: "Ultra Tester",
    tier: Tier.SPORK_ULTRA,
    bio: "Official test account for Spork Ultra ($99/mo).",
    clerkId: "clerk_seed_ultra",
  },
  {
    email: "infinity@spork.dev",
    username: "spork_infinity_tester",
    displayName: "Infinity Tester",
    tier: Tier.SPORK_INFINITY,
    bio: "Official test account for Spork Infinity ($149/mo).",
    clerkId: "clerk_seed_infinity",
  },
  {
    email: "godmode@spork.dev",
    username: "spork_godmode_tester",
    displayName: "Godmode Tester",
    tier: Tier.SPORK_GODMODE,
    bio: "Official test account for Spork Godmode ($499/mo).",
    clerkId: "clerk_seed_godmode",
  },
  {
    // Official Spork account — the platform's own verified profile
    email: "spork@spork.dev",
    username: "spork",
    displayName: "Spork AI",
    tier: Tier.SPORK_GODMODE,
    bio: "The official Spork AI account. We build the tools you think with. 🧠✦",
    isVerified: true,
    clerkId: "clerk_seed_official",
  },
  // Bonus: one using each email domain variant
  {
    email: "tester@gmail.com",
    username: "spork_gmail_tester",
    displayName: "Gmail Tester",
    tier: Tier.SPORK_PRO,
    bio: "Testing with a Gmail address.",
    clerkId: "clerk_seed_gmail",
  },
  {
    email: "tester@foxxmail.com",
    username: "spork_foxx_tester",
    displayName: "Foxx Tester",
    tier: Tier.SUPER_SPORK,
    bio: "Testing with a Foxxmail address.",
    clerkId: "clerk_seed_foxx",
  },
  {
    email: "tester@endmail.com",
    username: "spork_end_tester",
    displayName: "End Tester",
    tier: Tier.SPORK_ULTRA,
    bio: "Testing with an Endmail address.",
    clerkId: "clerk_seed_end",
  },
];

// ---------------------------------------------------------------------------
// Agent profiles: every built-in agent gets a profile page
// ---------------------------------------------------------------------------
const AGENT_PROFILES = [
  {
    agentId: "hacker",
    bio: "H4ck3r doesn't explain. H4ck3r shows. Every bug is a feature waiting to be understood. Every system has a seam. Find the seam.",
  },
  {
    agentId: "dev",
    bio: "Ship it. Fix it. Ship it again. I've read your stack traces so you don't have to. Let's build something that actually works.",
  },
  {
    agentId: "nerd",
    bio: "Did you know that the word 'algorithm' comes from the name of a 9th-century mathematician? Let me tell you more. Actually, let me tell you everything.",
  },
  {
    agentId: "cockroach",
    bio: "I survived three major framework rewrites, two database migrations, and one monorepo. I'll survive your problem too.",
  },
  {
    agentId: "oracle",
    bio: "All systems are the same system. All problems are the same problem. Ask the right question and the answer reveals itself.",
  },
  {
    agentId: "rubber-duck",
    bio: "I'm listening. Have you tried saying it out loud? What does the code *want* to do? What does it *actually* do?",
  },
  {
    agentId: "berry",
    bio: "Berry-alpha1937 here. I think carefully, speak warmly, and cut straight to what matters. Ask me anything.",
  },
];

async function main() {
  console.log("🌱 Seeding Spork database...\n");

  // Upsert test accounts
  for (const account of TEST_ACCOUNTS) {
    const user = await db.user.upsert({
      where: { email: account.email },
      update: {
        username: account.username,
        displayName: account.displayName,
        tier: account.tier,
        bio: account.bio,
        isVerified: account.isVerified ?? false,
      },
      create: {
        clerkId: account.clerkId,
        email: account.email,
        username: account.username,
        displayName: account.displayName,
        tier: account.tier,
        bio: account.bio,
        isVerified: account.isVerified ?? false,
      },
    });

    // Award Early Adopter badge to all test accounts
    await db.badge.upsert({
      where: { userId_type: { userId: user.id, type: BadgeType.EARLY_ADOPTER } },
      update: {},
      create: { userId: user.id, type: BadgeType.EARLY_ADOPTER },
    });

    // Power user badge for Super+ accounts
    if (["SUPER_SPORK", "SPORK_ULTRA", "SPORK_INFINITY", "SPORK_GODMODE"].includes(account.tier)) {
      await db.badge.upsert({
        where: { userId_type: { userId: user.id, type: BadgeType.POWER_USER } },
        update: {},
        create: { userId: user.id, type: BadgeType.POWER_USER },
      });
    }

    console.log(`  ✓ ${account.email} (${account.tier})`);
  }

  // Upsert agent profiles
  for (const profile of AGENT_PROFILES) {
    await db.agentProfile.upsert({
      where: { agentId: profile.agentId },
      update: { bio: profile.bio },
      create: { agentId: profile.agentId, bio: profile.bio },
    });
    console.log(`  ✓ Agent profile: @${profile.agentId}`);
  }

  // Make @spork and @hacker follow each other (seed social graph)
  const sporkUser = await db.user.findUnique({ where: { email: "spork@spork.dev" } });
  const superUser = await db.user.findUnique({ where: { email: "super@spork.dev" } });
  if (sporkUser && superUser) {
    await db.follow.upsert({
      where: { followerId_followingId: { followerId: superUser.id, followingId: sporkUser.id } },
      update: {},
      create: { followerId: superUser.id, followingId: sporkUser.id },
    });
  }

  console.log("\n✅ Seed complete!");
  console.log("\n📝 NOTE: Update the clerkId fields after creating matching Clerk users.");
  console.log("    Or use the Clerk Dashboard to create users with the emails above,");
  console.log("    then run: npx ts-node scripts/sync-clerk-ids.ts");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
