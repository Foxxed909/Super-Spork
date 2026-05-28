"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FREE_MODELS, PAID_MODELS, type ModelConfig } from "@/lib/models";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  userTier: "FREE" | "SUPER_SPORK";
}

export function ModelSelector({ value, onChange, userTier }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isSuperSpork = userTier === "SUPER_SPORK";
  const availableModels = isSuperSpork
    ? [...FREE_MODELS, ...PAID_MODELS]
    : FREE_MODELS;

  const currentModel =
    availableModels.find((m) => m.id === value) ?? FREE_MODELS[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white hover:border-[#3a3a3a] transition-colors"
      >
        <span className="font-medium">{currentModel.name}</span>
        <span className="text-[10px] text-[#666] bg-[#222] px-1.5 py-0.5 rounded">
          {currentModel.contextWindow}
        </span>
        <ChevronDown size={14} className="text-[#666]" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-xl z-50 overflow-hidden">
          {FREE_MODELS.length > 0 && (
            <ModelGroup
              label="Free Models"
              models={FREE_MODELS}
              value={value}
              onChange={(id) => { onChange(id); setOpen(false); }}
            />
          )}
          {isSuperSpork && PAID_MODELS.length > 0 && (
            <ModelGroup
              label="Super Spork"
              models={PAID_MODELS}
              value={value}
              onChange={(id) => { onChange(id); setOpen(false); }}
              accent
            />
          )}
          {!isSuperSpork && (
            <div className="p-3 border-t border-[#2a2a2a]">
              <p className="text-xs text-[#666] text-center">
                <span className="text-[#a78bfa] font-medium">Upgrade to Super Spork</span>{" "}
                to unlock Claude, GPT-4o, Gemini & more
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ModelGroup({
  label,
  models,
  value,
  onChange,
  accent,
}: {
  label: string;
  models: ModelConfig[];
  value: string;
  onChange: (id: string) => void;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="px-3 py-2 flex items-center gap-1.5">
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-wider",
            accent ? "text-[#a78bfa]" : "text-[#555]"
          )}
        >
          {label}
        </span>
      </div>
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => onChange(model.id)}
          className={cn(
            "w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[#1e1e1e] transition-colors",
            value === model.id && "bg-[#1e1e1e]"
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {model.name}
              </span>
              <span className="text-[10px] text-[#555] bg-[#1a1a1a] px-1.5 py-0.5 rounded">
                {model.contextWindow}
              </span>
            </div>
            <p className="text-xs text-[#666] mt-0.5 truncate">
              {model.description}
            </p>
          </div>
          {value === model.id && (
            <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] mt-1.5 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
}

export function LockedModelSelector() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#666] cursor-not-allowed">
      <Lock size={12} />
      <span>Unlock models with Super Spork</span>
    </div>
  );
}
