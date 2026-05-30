"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { AGENTS } from "@/lib/agents";
import { cn } from "@/lib/utils";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface AgentSelectorProps {
  value: string | null;
  onChange: (agentId: string | null) => void;
  userTier: string;
}

export function AgentSelector({ value, onChange, userTier }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeAgent = AGENTS.find((a) => a.id === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const freeAgents = AGENTS.filter((a) => a.tier === "free");
  const paidAgents = AGENTS.filter((a) => a.tier === "paid");

  return (
    <div ref={ref} className="relative">
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors",
          activeAgent
            ? "bg-[#1a1a1a] border-[#3a3a3a] text-white"
            : "bg-transparent border-[#2a2a2a] text-[#666] hover:text-[#aaa] hover:border-[#3a3a3a]"
        )}
      >
        {activeAgent ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2"
            >
              <span>{activeAgent.emoji}</span>
              <span className="font-medium">{activeAgent.name}</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="ml-0.5 text-[#666] hover:text-white"
              aria-label="Clear agent"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2"
          >
            <span className="text-[#555]">No agent</span>
            <ChevronDown size={14} className="text-[#555]" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#666] hover:bg-[#1e1e1e] hover:text-white transition-colors border-b border-[#2a2a2a]"
          >
            No agent (default)
          </button>

          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">Free Agents</span>
          </div>
          {freeAgents.map((agent) => (
            <AgentOption
              key={agent.id}
              agent={agent}
              isActive={value === agent.id}
              isLocked={false}
              onSelect={() => { onChange(agent.id); setOpen(false); }}
            />
          ))}

          <div className="px-3 pt-2 pb-1 border-t border-[#2a2a2a] mt-1">
            <span className="text-[10px] font-semibold text-[#a78bfa] uppercase tracking-wider">Super Spork</span>
          </div>
          {paidAgents.map((agent) => {
            const isLocked = (TIER_RANK[userTier] ?? 0) < 3;
            return (
              <AgentOption
                key={agent.id}
                agent={agent}
                isActive={value === agent.id}
                isLocked={isLocked}
                onSelect={() => { if (!isLocked) { onChange(agent.id); setOpen(false); } }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentOption({
  agent,
  isActive,
  isLocked,
  onSelect,
}: {
  agent: (typeof AGENTS)[0];
  isActive: boolean;
  isLocked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={isLocked}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
        isActive ? "bg-[#1e1e1e]" : "hover:bg-[#1a1a1a]",
        isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <span className="text-base">{agent.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{agent.name}</p>
        <p className="text-[10px] text-[#555] truncate">{agent.tagline}</p>
      </div>
      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] shrink-0" />}
    </button>
  );
}
