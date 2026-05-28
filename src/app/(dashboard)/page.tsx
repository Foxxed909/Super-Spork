"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { MessageInput } from "@/components/chat/MessageInput";
import { DEFAULT_FREE_MODEL } from "@/lib/models";
import { Sparkles } from "lucide-react";

interface UserData {
  tier: "FREE" | "SUPER_SPORK";
  dailyMessages: number;
  dailyLimit: number;
}

const SUGGESTIONS = [
  "Explain how transformers work in plain English",
  "Write a Python script to rename files in bulk",
  "What's the difference between TCP and UDP?",
  "Debug this: why is my useEffect running twice?",
  "Design a REST API for a task manager app",
  "Explain async/await vs promises",
];

export default function HomePage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_FREE_MODEL);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isCreating) return;
    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: selectedModel }),
      });
      if (!res.ok) {
        setCreateError("Failed to create conversation. Please try again.");
        return;
      }
      const conv = await res.json();
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(input.trim())}`);
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const isAtLimit =
    userData?.tier === "FREE" &&
    userData.dailyMessages >= userData.dailyLimit;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e]">
        {userData && (
          <ModelSelector
            value={selectedModel}
            onChange={setSelectedModel}
            userTier={userData.tier}
          />
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">
            {userData?.tier === "SUPER_SPORK" ? (
              <>
                <span className="text-[#a78bfa]">Super</span> Spork
              </>
            ) : (
              "Spork"
            )}
          </h1>
          <p className="text-[#666] text-sm">
            {userData?.tier === "SUPER_SPORK"
              ? "Full power. No limits."
              : "What can I help with today?"}
          </p>
        </div>

        {/* Suggestions */}
        <div className="grid grid-cols-2 gap-2 max-w-2xl w-full sm:grid-cols-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="text-left px-3 py-2.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#888] hover:text-white hover:border-[#3a3a3a] transition-colors leading-relaxed"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Create error */}
      {createError && (
        <div className="px-4 pt-2 max-w-3xl mx-auto w-full">
          <p className="text-sm text-red-400 text-center">{createError}</p>
        </div>
      )}

      {/* Input */}
      {isAtLimit ? (
        <div className="px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#888] mb-3">
              You&apos;ve used all {userData?.dailyLimit.toLocaleString()} free messages today.
            </p>
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] text-white rounded-lg text-sm font-semibold hover:bg-[#9061f9] transition-colors"
            >
              <Sparkles size={14} />
              Upgrade to Super Spork
            </a>
          </div>
        </div>
      ) : (
        <MessageInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onStop={() => {}}
          isLoading={isCreating}
          disabled={!userData}
        />
      )}
    </div>
  );
}
