"use client";

import { useEffect, useState } from "react";
import { History, ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { FREE_MODELS, PAID_MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface VoteEntry {
  id: string;
  winnerId: string;
  loserId: string;
  prompt: string;
  createdAt: string;
}

const ALL_MODELS_LIST = [...FREE_MODELS, ...PAID_MODELS];

function modelName(id: string): string {
  if (id === "tie") return "Tie";
  return ALL_MODELS_LIST.find((m) => m.id === id)?.name ?? id.split("/").pop() ?? id;
}

export default function ArenaHistoryPage() {
  const [votes, setVotes] = useState<VoteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userTier, setUserTier] = useState<string>("FREE");

  useEffect(() => {
    Promise.all([
      fetch("/api/arena/history").then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
    ]).then(([v, u]) => {
      setVotes(Array.isArray(v) ? v : []);
      setUserTier(u.tier ?? "FREE");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  if ((TIER_RANK[userTier] ?? 0) < 3) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <Swords size={40} className="text-[#444]" />
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Arena History</h2>
          <p className="text-[#666] text-sm">Super Spork required to access Arena.</p>
        </div>
        <Link href="/settings" className="px-6 py-2 bg-[#a78bfa] text-white rounded-2xl text-sm font-semibold">
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/arena" className="text-[#555] hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <History size={18} className="text-[#a78bfa]" />
          <h1 className="text-xl font-black text-white">Vote History</h1>
        </div>
        <span className="text-xs text-[#555] ml-auto">{votes.length} vote{votes.length !== 1 ? "s" : ""}</span>
      </div>

      {votes.length === 0 ? (
        <div className="text-center py-16">
          <Swords size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#555] text-sm">No votes yet.</p>
          <p className="text-[#444] text-xs mt-1">Head to Arena to start comparing models.</p>
          <Link href="/arena" className="inline-block mt-4 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#888] hover:text-white rounded-2xl transition-colors">
            Go to Arena
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {votes.map((vote) => (
            <div
              key={vote.id}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-sm text-[#ccc] leading-relaxed line-clamp-2">{vote.prompt}</p>
                <span className="text-[10px] text-[#555] shrink-0">{formatDate(vote.createdAt)}</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full border",
                  vote.winnerId === "tie"
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                )}>
                  {vote.winnerId === "tie" ? "🤝" : "🏆"} {modelName(vote.winnerId)}
                </span>
                <span className="text-[#444]">vs</span>
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400">
                  {modelName(vote.loserId)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
