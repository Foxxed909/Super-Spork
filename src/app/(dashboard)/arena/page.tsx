"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Swords, ThumbsUp, Minus, Trophy, History } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { FREE_MODELS, PAID_MODELS, type ModelConfig } from "@/lib/models";
import { cn } from "@/lib/utils";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface UserData {
  tier: string;
}

interface PanelState {
  response: string;
  loading: boolean;
  done: boolean;
}

const EMPTY_PANEL: PanelState = { response: "", loading: false, done: false };

function ModelPicker({
  value,
  onChange,
  userTier,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  userTier: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isSuperSpork = (TIER_RANK[userTier] ?? 0) >= 3;
  const models = isSuperSpork ? [...FREE_MODELS, ...PAID_MODELS] : FREE_MODELS;
  const current = models.find((m) => m.id === value) ?? FREE_MODELS[0];

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white hover:border-[#3a3a3a] transition-colors"
      >
        <span className="text-xs text-[#666] font-medium">{label}</span>
        <span className="font-medium">{current.name}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
          {models.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-[#1e1e1e] transition-colors",
                value === m.id && "bg-[#1e1e1e]"
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{m.name}</p>
                <p className="text-xs text-[#555] truncate">{m.description}</p>
              </div>
              {value === m.id && <div className="w-1.5 h-1.5 rounded-full bg-[#a78bfa] mt-1.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResponsePanel({
  state,
  modelName,
}: {
  state: PanelState;
  modelName: string;
}) {
  return (
    <div className="flex flex-col flex-1 min-w-0 border border-[#2a2a2a] rounded-2xl overflow-hidden bg-[#0d0d0d]">
      <div className="px-4 py-2 border-b border-[#2a2a2a] bg-[#111] flex items-center gap-2">
        <span className="text-xs text-[#666] font-medium">{modelName}</span>
        {state.loading && (
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full bg-[#a78bfa]/50 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 text-sm">
        {state.response ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {state.response}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-[#444] text-sm">Response will appear here...</p>
        )}
      </div>
    </div>
  );
}

export default function ArenaPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [leftModel, setLeftModel] = useState("openai/gpt-oss-120b:free");
  const [rightModel, setRightModel] = useState("openai/gpt-oss-20b:free");
  const [left, setLeft] = useState<PanelState>(EMPTY_PANEL);
  const [right, setRight] = useState<PanelState>(EMPTY_PANEL);
  const [voted, setVoted] = useState<"left" | "right" | "tie" | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
  }, []);

  const isSuperSpork = (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) >= 3;
  const bothDone = left.done && right.done;

  async function streamResponse(
    model: string,
    text: string,
    setter: React.Dispatch<React.SetStateAction<PanelState>>
  ) {
    setter({ response: "", loading: true, done: false });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: text }],
        }),
      });
      if (!res.ok || !res.body) {
        setter({ response: "Error: could not get response.", loading: false, done: true });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse Vercel AI SDK data stream protocol (0:"text" lines)
        for (const line of chunk.split("\n")) {
          if (line.startsWith('0:"')) {
            try {
              const text = JSON.parse(line.slice(2));
              accumulated += text;
              setter({ response: accumulated, loading: true, done: false });
            } catch {
              // skip malformed chunk
            }
          }
        }
      }
      setter({ response: accumulated, loading: false, done: true });
    } catch {
      setter({ response: "Error: request failed.", loading: false, done: true });
    }
  }

  const handleSubmit = () => {
    if (!prompt.trim() || left.loading || right.loading) return;
    const text = prompt.trim();
    setSubmittedPrompt(text);
    setPrompt("");
    setVoted(null);
    streamResponse(leftModel, text, setLeft);
    streamResponse(rightModel, text, setRight);
  };

  const handleVote = async (winner: "left" | "right" | "tie") => {
    if (voted || voting) return;
    setVoting(true);
    const winnerId = winner === "left" ? leftModel : winner === "right" ? rightModel : "tie";
    const loserId = winner === "left" ? rightModel : winner === "right" ? leftModel : "tie";
    try {
      await fetch("/api/arena/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winnerId, loserId, prompt: submittedPrompt }),
      });
    } catch {
      // vote can fail silently; the UX feedback is what matters
    }
    setVoted(winner);
    setVoting(false);
  };

  if (!userData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isSuperSpork) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
          <Swords size={28} className="text-[#a78bfa]" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Spork Arena</h2>
          <p className="text-[#666] text-sm max-w-xs">
            Pit two AI models head-to-head on the same prompt and vote for the winner.
            Super Spork exclusive.
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

  const leftModelName = [...FREE_MODELS, ...PAID_MODELS].find((m) => m.id === leftModel)?.name ?? leftModel;
  const rightModelName = [...FREE_MODELS, ...PAID_MODELS].find((m) => m.id === rightModel)?.name ?? rightModel;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-[#a78bfa]" />
          <span className="font-bold text-white text-sm">Spork Arena</span>
          <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full">
            SUPER
          </span>
          <Link
            href="/arena/leaderboard"
            className="flex items-center gap-1 text-xs text-[#555] hover:text-[#a78bfa] transition-colors ml-2"
          >
            <Trophy size={12} />
            Leaderboard
          </Link>
          <Link
            href="/arena/history"
            className="flex items-center gap-1 text-xs text-[#555] hover:text-[#a78bfa] transition-colors"
          >
            <History size={12} />
            History
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <ModelPicker
            value={leftModel}
            onChange={setLeftModel}
            userTier={userData.tier}
            label="Left:"
          />
          <span className="text-[#444] text-xs">vs</span>
          <ModelPicker
            value={rightModel}
            onChange={setRightModel}
            userTier={userData.tier}
            label="Right:"
          />
        </div>
      </div>

      {/* Response panels */}
      <div className="flex flex-1 min-h-0 gap-3 p-4">
        <ResponsePanel state={left} modelName={leftModelName} />
        <ResponsePanel state={right} modelName={rightModelName} />
      </div>

      {/* Vote buttons */}
      {bothDone && submittedPrompt && (
        <div className="px-4 pb-2 flex items-center justify-center gap-3 shrink-0">
          {voted ? (
            <p className="text-sm text-[#a78bfa] font-medium">
              {voted === "tie" ? "Tied — voted!" : `${voted === "left" ? leftModelName : rightModelName} wins — voted!`}
            </p>
          ) : (
            <>
              <button
                onClick={() => handleVote("left")}
                disabled={voting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors disabled:opacity-50"
              >
                <ThumbsUp size={13} />
                {leftModelName} wins
              </button>
              <button
                onClick={() => handleVote("tie")}
                disabled={voting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#666] hover:text-white hover:border-[#3a3a3a] transition-colors disabled:opacity-50"
              >
                <Minus size={13} />
                Tie
              </button>
              <button
                onClick={() => handleVote("right")}
                disabled={voting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-white hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors disabled:opacity-50"
              >
                {rightModelName} wins
                <ThumbsUp size={13} />
              </button>
            </>
          )}
        </div>
      )}

      {/* Prompt input */}
      <div className="p-4 border-t border-[#2a2a2a] shrink-0">
        <div className="flex items-end gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-3 py-2 focus-within:border-[#3a3a3a] transition-colors">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={left.loading || right.loading}
            placeholder="Enter a prompt to test both models..."
            rows={1}
            className="flex-1 bg-transparent text-sm text-[#f0f0f0] placeholder-[#555] resize-none outline-none leading-relaxed"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={handleSubmit}
            disabled={!prompt.trim() || left.loading || right.loading}
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all",
              prompt.trim() && !left.loading && !right.loading
                ? "bg-[#a78bfa] text-white"
                : "bg-[#2a2a2a] text-[#555] cursor-not-allowed"
            )}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
