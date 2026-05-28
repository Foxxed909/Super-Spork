import { hasClerkPublishableKey } from "@/lib/clerk-public";

export function hasClerkServerKeys() {
  const key = process.env.CLERK_SECRET_KEY;
  return (
    hasClerkPublishableKey() &&
    Boolean(key && !key.includes("...") && !key.includes("REPLACE_ME"))
  );
}
