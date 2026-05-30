"use client";

import { Lock, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SporkAgent } from "@/lib/agents";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface AgentCardProps {
  agent: SporkAgent;
  userTier: string;
  onSelect: (agentId: string) => void;
}

export function AgentCard({ agent, userTier, onSelect }: AgentCardProps) {
  const isLocked = agent.tier === "paid" && (TIER_RANK[userTier] ?? 0) < 3;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 p-4 rounded-2xl border transition-all",
        isLocked
          ? "border-[#2a2a2a] bg-[#111] opacity-60"
          : "border-[#2a2a2a] bg-[#111] hover:border-[#3a3a3a] hover:bg-[#161616] cursor-pointer"
      )}
      style={
        !isLocked
          ? { "--agent-accent": agent.accentColor } as React.CSSProperties
          : undefined
      }
      onClick={() => !isLocked && onSelect(agent.id)}
    >
      {/* Lock badge */}
      {isLocked && (
        <div className="absolute top-3 right-3 flex items-center gap-1 text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full">
          <Lock size={9} />
          PRO
        </div>
      )}

      {/* Tier dot for free */}
      {!isLocked && agent.tier === "free" && (
        <div className="absolute top-3 right-3 text-[10px] bg-[#1e1e1e] text-[#555] px-1.5 py-0.5 rounded-full border border-[#2a2a2a]">
          FREE
        </div>
      )}

      {/* Emoji + color accent */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
        style={{ backgroundColor: `${agent.accentColor}20`, border: `1px solid ${agent.accentColor}40` }}
      >
        {agent.emoji}
      </div>

      <div className="flex-1">
        <h3 className="font-bold text-white text-sm">{agent.name}</h3>
        <p className="text-xs text-[#666] mt-0.5 leading-relaxed">{agent.tagline}</p>
      </div>

      {!isLocked && (
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(agent.id); }}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: `${agent.accentColor}20`,
            color: agent.accentColor,
          }}
        >
          <MessageSquare size={11} />
          Chat with {agent.name}
        </button>
      )}
    </div>
  );
}
