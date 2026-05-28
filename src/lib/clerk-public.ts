export function hasClerkPublishableKey() {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(key && !key.includes("...") && !key.includes("REPLACE_ME"));
}
