"use client";

import { useEffect, useState } from "react";
import { BarChart2, MessageSquare, BookOpen, Brain, Zap, TrendingUp, Cpu } from "lucide-react";

interface StatsData {
  totalConversations: number;
  totalMessages: number;
  totalSnippets: number;
  totalMemories: number;
  recentConversations: number;
  topModels: Array<{ model: string; count: number }>;
  totalWords: number;
  tier: string;
  dailyMessages: number;
}

const TIER_LABELS: Record<string, string> = {
  FREE: "Free",
  SPORK_LITE: "Spork Lite",
  SPORK_PRO: "Spork Pro",
  SUPER_SPORK: "Super Spork",
  SPORK_ULTRA: "Spork Ultra",
  SPORK_INFINITY: "Spork Infinity",
  SPORK_GODMODE: "Spork Godmode",
};

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[#555] text-sm">Failed to load stats.</p>
      </div>
    );
  }

  const avgWordsPerMessage = stats.totalMessages > 0
    ? Math.round(stats.totalWords / stats.totalMessages)
    : 0;

  const statCards = [
    { label: "Total Conversations", value: stats.totalConversations.toLocaleString(), icon: MessageSquare, color: "text-[#a78bfa]" },
    { label: "Total Messages", value: stats.totalMessages.toLocaleString(), icon: Zap, color: "text-blue-400" },
    { label: "Total Words", value: stats.totalWords.toLocaleString(), icon: TrendingUp, color: "text-green-400" },
    { label: "Snippets", value: stats.totalSnippets.toLocaleString(), icon: BookOpen, color: "text-yellow-400" },
    { label: "Memories", value: stats.totalMemories.toLocaleString(), icon: Brain, color: "text-pink-400" },
    { label: "Last 30 Days", value: stats.recentConversations.toLocaleString(), icon: BarChart2, color: "text-orange-400" },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white mb-1 flex items-center gap-2">
          <BarChart2 size={22} className="text-[#a78bfa]" />
          Your Stats
        </h1>
        <p className="text-sm text-[#555]">
          All-time usage across your Spork account ·{" "}
          <span className="text-[#a78bfa] font-medium">{TIER_LABELS[stats.tier] ?? stats.tier}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={15} className={s.color} />
              <span className="text-[11px] text-[#555] uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Averages */}
      <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl px-5 py-4 mb-6">
        <h2 className="text-xs text-[#555] uppercase tracking-wider font-semibold mb-3">Averages</h2>
        <div className="flex gap-8 flex-wrap">
          <div>
            <span className="text-[11px] text-[#555] block">Avg words / message</span>
            <p className="text-white font-bold text-lg mt-0.5">{avgWordsPerMessage.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-[11px] text-[#555] block">Messages today</span>
            <p className="text-white font-bold text-lg mt-0.5">{stats.dailyMessages}</p>
          </div>
          <div>
            <span className="text-[11px] text-[#555] block">Msgs / conversation</span>
            <p className="text-white font-bold text-lg mt-0.5">
              {stats.totalConversations > 0
                ? Math.round(stats.totalMessages / stats.totalConversations)
                : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Top models */}
      {stats.topModels.length > 0 && (
        <div className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-2xl px-5 py-4">
          <h2 className="text-xs text-[#555] uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
            <Cpu size={12} />
            Top Models Used
          </h2>
          <div className="space-y-2">
            {stats.topModels.map((m, i) => {
              const pct = Math.round((m.count / stats.totalConversations) * 100);
              return (
                <div key={m.model} className="flex items-center gap-3">
                  <span className="text-[11px] text-[#444] w-4 tabular-nums">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs text-[#ccc] truncate">{m.model.split("/").pop()}</span>
                      <span className="text-[10px] text-[#555] ml-2 shrink-0">{m.count} convs · {pct}%</span>
                    </div>
                    <div className="h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#a78bfa]/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
