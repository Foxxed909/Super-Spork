"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { MessageInput } from "@/components/chat/MessageInput";
import { AnimatedBackground, type BgMode } from "@/components/AnimatedBackground";
import { DEFAULT_FREE_MODEL } from "@/lib/models";
import { Sparkles, MessageSquare } from "lucide-react";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface UserData {
  tier: string;
  dailyMessages: number;
  dailyLimit: number;
}

interface RecentConv {
  id: string;
  title: string;
}

const SUGGESTIONS = [
  { icon: "⚡", text: "Explain how transformers work" },
  { icon: "🐍", text: "Write a Python script to rename files" },
  { icon: "🌐", text: "TCP vs UDP — what's the difference?" },
  { icon: "🐛", text: "Why is my useEffect running twice?" },
  { icon: "🗂️", text: "Design a REST API for a task manager" },
  { icon: "⚙️", text: "Explain async/await vs promises" },
];

const BG_MODES: { mode: BgMode; label: string }[] = [
  { mode: "stars", label: "✦ Stars" },
  { mode: "rain",  label: "🌧 Rain" },
  { mode: "storm", label: "⛈ Storm" },
  { mode: "void",  label: "◎ Void" },
  { mode: "blackhole", label: "● Black Hole" },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(DEFAULT_FREE_MODEL);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [input, setInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [bgMode, setBgMode] = useState<BgMode>("stars");
  const [recentConvs, setRecentConvs] = useState<RecentConv[]>([]);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
    fetch("/api/conversations?limit=5")
      .then((r) => r.json())
      .then((data) => {
        const convs = Array.isArray(data) ? data : (data.conversations ?? []);
        setRecentConvs(convs.slice(0, 5));
      })
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
      if (!res.ok) { setCreateError("Failed to create conversation."); return; }
      const conv = await res.json();
      router.push(`/chat/${conv.id}?q=${encodeURIComponent(input.trim())}`);
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const isAtLimit = (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) === 0 && (userData?.dailyMessages ?? 0) >= (userData?.dailyLimit ?? Infinity);
  const isSuperSpork = (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) >= 3;

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground mode={bgMode} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] bg-black/30 backdrop-blur-sm">
        {userData && (
          <ModelSelector value={selectedModel} onChange={setSelectedModel} userTier={userData.tier} />
        )}
        {/* BG mode switcher */}
        <div className="ml-auto flex items-center gap-1">
          {BG_MODES.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setBgMode(mode)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                bgMode === mode
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Center */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 gap-8 -mt-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 select-none">
          <h1 className="text-5xl font-black tracking-tight leading-none drop-shadow-[0_0_30px_rgba(167,139,250,0.35)]">
            {isSuperSpork ? (
              <><span className="text-[#a78bfa]">Super</span>{" "}<span className="text-white">Spork</span></>
            ) : (
              <span className="text-white">Spork</span>
            )}
          </h1>
          <p className="text-white/30 text-sm font-medium">
            {isSuperSpork ? "Full power. No limits." : "What do you want to know?"}
          </p>
        </div>

        {/* Suggestions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-[640px] w-full">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => setInput(s.text)}
              className="group flex items-start gap-2.5 text-left px-3.5 py-3 rounded-2xl
                bg-white/[0.03] border border-white/[0.07] backdrop-blur-sm
                text-xs text-white/35 hover:text-white/70 hover:bg-white/[0.07] hover:border-white/[0.14]
                transition-all leading-relaxed"
            >
              <span className="text-base leading-none mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">{s.icon}</span>
              <span>{s.text}</span>
            </button>
          ))}
        </div>

        {/* Recent conversations */}
        {recentConvs.length > 0 && (
          <div className="max-w-[640px] w-full">
            <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold mb-2">Continue where you left off</p>
            <div className="flex flex-wrap gap-1.5">
              {recentConvs.map((c) => (
                <Link
                  key={c.id}
                  href={`/chat/${c.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-white/30 hover:text-white/60 bg-white/[0.03] border border-white/[0.05] hover:border-white/[0.12] transition-all truncate max-w-[200px]"
                >
                  <MessageSquare size={11} className="shrink-0" />
                  <span className="truncate">{c.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {createError && (
        <div className="relative z-10 px-4 pt-2 max-w-3xl mx-auto w-full">
          <p className="text-sm text-red-400 text-center">{createError}</p>
        </div>
      )}

      {/* Input */}
      <div className="relative z-10">
        {isAtLimit ? (
          <div className="px-4 pb-5 pt-2 max-w-3xl mx-auto w-full">
            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-center backdrop-blur-sm">
              <p className="text-sm text-white/40 mb-3">
                You&apos;ve used all {userData?.dailyLimit.toLocaleString()} free messages today.
              </p>
              <a
                href="/settings"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] text-white rounded-full text-sm font-semibold hover:bg-[#9061f9] transition-colors"
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
    </div>
  );
}
