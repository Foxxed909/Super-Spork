import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { hasClerkPublishableKey } from "@/lib/clerk-public";

export default function SignUpPage() {
  const clerkEnabled = hasClerkPublishableKey();

  return (
    <div className="flex h-full items-center justify-center bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Join <span className="text-[#a78bfa]">Spork</span>
          </h1>
          <p className="mt-2 text-sm text-[#888]">
            Start for free. Upgrade anytime.
          </p>
        </div>
        {clerkEnabled ? (
          <SignUp
            fallbackRedirectUrl="/"
            appearance={{
              variables: {
                colorPrimary: "#a78bfa",
                colorBackground: "#111111",
                colorInputBackground: "#1a1a1a",
                colorInputText: "#f0f0f0",
                colorText: "#f0f0f0",
                colorTextSecondary: "#888888",
                borderRadius: "10px",
                fontFamily: "var(--font-geist-sans)",
              },
              elements: {
                card: "shadow-2xl border border-[#2a2a2a]",
                formButtonPrimary:
                  "bg-[#a78bfa] hover:bg-[#9061f9] text-white font-semibold",
              },
            }}
          />
        ) : (
          <div className="max-w-sm rounded-2xl border border-[#2a2a2a] bg-[#111] p-5 text-center">
            <p className="text-sm text-[#aaa]">
              Clerk keys are not configured for this local run.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-full bg-[#a78bfa] px-4 py-2 text-sm font-semibold text-white hover:bg-[#9061f9]"
            >
              Continue in demo mode
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
