import { db } from "@/lib/db";

export async function getOrCreateUser(clerkId: string) {
  return db.user.upsert({
    where: { clerkId },
    update: {},
    create: {
      clerkId,
      email: `${clerkId}@clerk.local`,
    },
  });
}
