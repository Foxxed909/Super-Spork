"use client";

import { useEffect, useState } from "react";
import { Trophy, ArrowLeft, Swords } from "lucide-react";
import Link from "next/link";
import { FREE_MODELS, PAID_MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface LeaderboardEntry {
  modelId: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

const ALL_MODELS = [...FREE_MODELS, ...PAID_MODELS];

function modelName(id: string): string {
  return ALL_MODELS.find((m) => m.id === id)?.name ?? id;
}

function WinRatePill({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
        pct > 60
          ? "bg-emerald-500/15 text-emerald-400"
          : pct >= 40
          ? "bg-yellow-500/15 text-yellow-400"
          : "bg-red-500/15 text-red-400"
      )}
    >
      {pct}%
    </span>
  );
}

const RANK_ACCENTS: Record<number, string> = {
  0: "border-l-2 border-yellow-400/70",
  1: "border-l-2 border-slate-400/70",
  2: "border-l-2 border-amber-700/70",
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [userTier, setUserTier] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/arena/leaderboard"),
      fetch("/api/user"),
    ]).then(async ([lb, u]) => {
      if (lb.status === 403) { setForbidden(true); return; }
      const [data, user] = await Promise.all([lb.json(), u.json()]);
      setEntries(data);
      setUserTier(user.tier);
    }).catch(() => setEntries([]));
  }, []);

  if (forbidden || (userTier !== null && (TIER_RANK[userTier] ?? 0) < 3)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
          <Swords size={28} className="text-[#a78bfa]" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Arena Leaderboard</h2>
          <p className="text-[#666] text-sm max-w-xs">
            Super Spork exclusive. Upgrade to see how models rank.
          </p>
        </div>
        <Link
          href="/settings"
          className="px-6 py-2.5 bg-[#a78bfa] hover:bg-[#9061f9] text-white rounded-2xl text-sm font-semibold transition-colors"
        >
          Upgrade to Super Spork
        </Link>
      </div>
    );
  }

  if (entries === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-3 shrink-0">
        <Link
          href="/arena"
          className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <ArrowLeft size={15} />
        </Link>
        <Trophy size={15} className="text-[#a78bfa]" />
        <span className="font-bold text-white text-sm">Arena Leaderboard</span>
        <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full">
          SUPER
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-4">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <Trophy size={32} className="text-[#333]" />
            <p className="text-[#555] text-sm max-w-xs">
              No votes yet — head to Arena to start comparing models.
            </p>
            <Link
              href="/arena"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#888] hover:text-white hover:border-[#3a3a3a] transition-colors"
            >
              <Swords size={13} />
              Go to Arena
            </Link>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_4rem] gap-x-3 px-3 py-1.5 text-[11px] text-[#444] font-medium uppercase tracking-wider mb-1">
              <span>#</span>
              <span>Model</span>
              <span className="text-right">Wins</span>
              <span className="text-right">Losses</span>
              <span className="text-right">Total</span>
              <span className="text-right">Win rate</span>
            </div>
            <div className="flex flex-col gap-1">
              {entries.map((entry, i) => (
                <div
                  key={entry.modelId}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_3rem_3rem_3rem_4rem] gap-x-3 items-center px-3 py-2.5 rounded-xl bg-[#0f0f0f] border border-[#1e1e1e] hover:border-[#2a2a2a] transition-colors",
                    RANK_ACCENTS[i] ?? ""
                  )}
                >
                  <span className="text-sm font-bold text-[#555]">{i + 1}</span>
                  <span className="text-sm text-white font-medium truncate">
                    {modelName(entry.modelId)}
                  </span>
                  <span className="text-sm text-emerald-400 text-right font-medium">{entry.wins}</span>
                  <span className="text-sm text-red-400/80 text-right font-medium">{entry.losses}</span>
                  <span className="text-sm text-[#666] text-right">{entry.total}</span>
                  <div className="flex justify-end">
                    <WinRatePill rate={entry.winRate} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
