"use client";

import { useState, useRef, useEffect } from "react";
import { GitFork, ChevronDown } from "lucide-react";
import { FREE_MODELS, PAID_MODELS } from "@/lib/models";
import { cn } from "@/lib/utils";

interface ForkButtonProps {
  conversationId: string;
  userTier: "FREE" | "SUPER_SPORK";
  onForked: (newConversationId: string) => void;
}

export function ForkButton({ conversationId, userTier, onForked }: ForkButtonProps) {
  const [open, setOpen] = useState(false);
  const [forking, setForking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const availableModels =
    userTier === "SUPER_SPORK"
      ? [...FREE_MODELS, ...PAID_MODELS]
      : FREE_MODELS;

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

  const handleFork = async (newModel: string) => {
    setForking(true);
    setOpen(false);
    try {
      const res = await fetch("/api/conversations/fork", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, newModel }),
      });
      if (!res.ok) throw new Error("Fork failed");
      const data = await res.json();
      if (data.id) onForked(data.id);
    } catch (err) {
      console.error("Fork error:", err);
    } finally {
      setForking(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={forking}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-transparent border border-[#2a2a2a] text-xs text-[#666] hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
      >
        <GitFork size={12} />
        {forking ? "Forking..." : "Fork"}
        <ChevronDown size={11} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 w-64 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#2a2a2a]">
            <p className="text-xs font-semibold text-white">Fork with model</p>
            <p className="text-[10px] text-[#555] mt-0.5">Copy this chat and continue with a different model</p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {availableModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleFork(model.id)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[#1e1e1e] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{model.name}</p>
                  <p className="text-[10px] text-[#555] mt-0.5 truncate">{model.description}</p>
                </div>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded-full shrink-0 mt-0.5",
                  model.tier === "free"
                    ? "bg-[#1e1e1e] text-[#555] border border-[#2a2a2a]"
                    : "bg-[#a78bfa]/10 text-[#a78bfa]"
                )}>
                  {model.contextWindow}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
