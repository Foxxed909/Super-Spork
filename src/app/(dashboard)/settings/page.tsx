"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Sparkles, CheckCircle2, Save, Brain, Trash2, Key, Copy, X, Plus, Eye, EyeOff, Cpu } from "lucide-react";
import { FREE_DAILY_LIMIT, FREE_MODELS, PAID_MODELS } from "@/lib/models";
import { hasClerkPublishableKey } from "@/lib/clerk-public";

type Tier = "FREE" | "SPORK_LITE" | "SPORK_PRO" | "SUPER_SPORK" | "SPORK_ULTRA" | "SPORK_INFINITY" | "SPORK_GODMODE";

interface UserData {
  tier: Tier;
  dailyMessages: number;
  dailyLimit: number;
  customInstructions: string;
  hasOpenrouterKey: boolean;
}

interface UsageStats {
  totalConversations: number;
  totalMessages: number;
  totalSnippets: number;
  totalMemories: number;
}

interface ApiToken {
  id: string;
  label: string;
  lastUsedAt: string | null;
  createdAt: string;
}

const TIERS: Array<{
  id: Tier;
  name: string;
  price: string;
  tagline: string;
  features: string[];
  color: string;
  crazy?: boolean;
}> = [
  {
    id: "FREE",
    name: "Spork Free",
    price: "$0",
    tagline: "The basics, no card required",
    features: [`${FREE_DAILY_LIMIT} messages/day`, "5 free models", "18 agents", "Voice input"],
    color: "#555",
  },
  {
    id: "SPORK_LITE",
    name: "Spork Lite",
    price: "$5",
    tagline: "Unlimited open models, memory & voice",
    features: ["No daily limit", "All 5 free models", "Memory (20 facts)", "Custom instructions", "Voice (full)"],
    color: "#3b82f6",
  },
  {
    id: "SPORK_PRO",
    name: "Spork Pro",
    price: "$12",
    tagline: "Frontier models, code, memory auto-extract",
    features: ["All Lite features", "Gemini 2.0 Flash + Llama 405B", "Spork Code (basic)", "Memory auto-extract", "Vaults & Stats"],
    color: "#8b5cf6",
  },
  {
    id: "SUPER_SPORK",
    name: "Super Spork",
    price: "$20",
    tagline: "All models, Canvas, Arena, web search",
    features: ["All Pro features", "All 11 frontier models", "Canvas (all artifacts)", "Arena mode", "Fork Tree + Web Search"],
    color: "#a78bfa",
  },
  {
    id: "SPORK_ULTRA",
    name: "Spork Ultra",
    price: "$99",
    tagline: "Everything + image gen, workspaces, CLI",
    features: ["All Super features", "Claude Opus 4.7 + o3", "Image generation", "10 Custom Agents", "CLI included + 10K API calls"],
    color: "#f59e0b",
    crazy: true,
  },
  {
    id: "SPORK_INFINITY",
    name: "Spork Infinity",
    price: "$149",
    tagline: "Team seats, SSO, white-label",
    features: ["All Ultra features", "Unlimited team seats", "SAML/SSO + audit logs", "White-label domain", "Unlimited API calls"],
    color: "#ec4899",
    crazy: true,
  },
  {
    id: "SPORK_GODMODE",
    name: "Spork Godmode",
    price: "$499",
    tagline: "Enterprise: dedicated GPU, SLA, fine-tuning",
    features: ["All Infinity features", "Dedicated GPU slot", "99.9% SLA + credit-back", "Custom fine-tuning pipeline", "Phone support + DPA"],
    color: "#ef4444",
    crazy: true,
  },
];

export default function SettingsPage() {
  const clerkEnabled = hasClerkPublishableKey();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [upgrading, setUpgrading] = useState<Tier | null>(null);
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memories, setMemories] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const [newMemory, setNewMemory] = useState("");
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [creatingToken, setCreatingToken] = useState(false);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);
  const [showTokenForm, setShowTokenForm] = useState(false);
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [showOrKey, setShowOrKey] = useState(false);
  const [savingOrKey, setSavingOrKey] = useState(false);
  const [orKeySaved, setOrKeySaved] = useState(false);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        setUserData(data);
        setInstructions(data.customInstructions ?? "");
      })
      .catch(() => {});

    if (clerkEnabled) {
      fetch("/api/memory").then((r) => r.json()).then(setMemories).catch(() => {});
      fetch("/api/tokens").then((r) => r.json()).then(setTokens).catch(() => {});
      fetch("/api/stats").then((r) => r.ok ? r.json() : null).then((d) => { if (d) setUsageStats(d); }).catch(() => {});
    }
  }, [clerkEnabled]);

  const handleSaveOpenrouterKey = async () => {
    setSavingOrKey(true);
    try {
      await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openrouterKey: openrouterKey || null }),
      });
      setOrKeySaved(true);
      setOpenrouterKey("");
      setTimeout(() => setOrKeySaved(false), 2000);
      setUserData((prev) => prev ? { ...prev, hasOpenrouterKey: !!openrouterKey } : prev);
    } finally {
      setSavingOrKey(false);
    }
  };

  const handleSaveInstructions = async () => {
    if (instructions.length > 2000) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instructions }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  const handleAddMemory = async () => {
    if (!newMemory.trim()) return;
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMemory }),
    });
    const mem = await res.json();
    setMemories((prev) => [mem, ...prev]);
    setNewMemory("");
  };

  const handleDeleteMemory = async (id: string) => {
    await fetch("/api/memory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const handleUpgrade = async (tier: Tier) => {
    setUpgrading(tier);
    try {
      const res = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error("Upgrade failed");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch { /* ignore */ } finally {
      setUpgrading(null);
    }
  };

  const handleCreateToken = async () => {
    if (!newTokenLabel.trim()) return;
    setCreatingToken(true);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newTokenLabel.trim() }),
      });
      if (!res.ok) return;
      const { token, label } = await res.json();
      setRevealedToken(token);
      setTokens((prev) => [{ id: token.slice(0, 8), label, lastUsedAt: null, createdAt: new Date().toISOString() }, ...prev]);
      setNewTokenLabel("");
      setShowTokenForm(false);
      // Refresh list to get real IDs
      fetch("/api/tokens").then((r) => r.json()).then(setTokens).catch(() => {});
    } finally {
      setCreatingToken(false);
    }
  };

  const handleRevokeToken = async (id: string) => {
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
    setTokens((prev) => prev.filter((t) => t.id !== id));
  };

  const currentTier = userData?.tier ?? "FREE";
  const tierIndex = TIERS.findIndex((t) => t.id === currentTier);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Usage Stats */}
      {usageStats && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-3">Account Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Conversations", value: usageStats.totalConversations },
              { label: "Messages", value: usageStats.totalMessages },
              { label: "Snippets", value: usageStats.totalSnippets },
              { label: "Memories", value: usageStats.totalMemories },
            ].map((s) => (
              <div key={s.label} className="bg-[#111] border border-[#2a2a2a] rounded-2xl px-4 py-3">
                <p className="text-xs text-[#555] mb-1">{s.label}</p>
                <p className="text-2xl font-black text-white">{s.value.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-Tier Pricing Grid */}
      <div className="mb-10">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-4">Your Plan</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TIERS.map((tier, i) => {
            const isCurrent = tier.id === currentTier;
            const isUpgrade = i > tierIndex;
            return (
              <div
                key={tier.id}
                className={`p-4 rounded-2xl border relative ${
                  isCurrent
                    ? `border-[${tier.color}]/40 bg-[${tier.color}]/5`
                    : "border-[#2a2a2a] bg-[#111]"
                } ${tier.crazy ? "ring-1 ring-[#f59e0b]/20" : ""}`}
                style={isCurrent ? { borderColor: `${tier.color}66`, background: `${tier.color}0d` } : {}}
              >
                {tier.crazy && (
                  <span className="absolute top-2 right-2 text-[9px] bg-[#f59e0b]/20 text-[#f59e0b] px-1.5 py-0.5 rounded-full font-bold">POWER</span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{tier.name}</span>
                  {isCurrent && (
                    <span className="text-[9px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full font-semibold">CURRENT</span>
                  )}
                </div>
                <p className="text-xl font-black text-white">{tier.price}<span className="text-xs text-[#666] font-normal">/mo</span></p>
                <p className="text-[11px] text-[#555] mb-3 leading-tight">{tier.tagline}</p>
                <ul className="space-y-1.5 text-[11px] text-[#888] mb-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <CheckCircle2 size={10} className="mt-0.5 shrink-0" style={{ color: tier.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                {isUpgrade && (
                  <button
                    onClick={() => handleUpgrade(tier.id)}
                    disabled={upgrading === tier.id}
                    className="w-full py-1.5 text-white text-xs font-semibold rounded-2xl transition-opacity disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, ${tier.color}, ${tier.color}bb)` }}
                  >
                    {upgrading === tier.id ? "Redirecting…" : `Upgrade to ${tier.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Instructions + char counter (Bug 4 + Bug 6 fix) */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-1">Custom Instructions</h2>
        <p className="text-xs text-[#555] mb-3">Tell Spork about yourself. Injected into every conversation.</p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={2000}
          placeholder="e.g. I'm a senior TypeScript developer. Prefer concise answers. Always use functional React patterns."
          rows={4}
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-2xl px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#444] resize-none outline-none focus:border-[#3a3a3a] transition-colors"
        />
        <div className="flex justify-between items-center mt-1">
          <span className={`text-xs ${instructions.length > 1800 ? "text-red-400" : "text-[#555]"}`}>
            {instructions.length} / 2000
          </span>
          <button
            onClick={handleSaveInstructions}
            disabled={saving || instructions.length > 2000}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] hover:bg-[#9061f9] text-white text-sm font-semibold rounded-2xl transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {saved ? "Saved!" : saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* OpenRouter Key */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Cpu size={14} className="text-[#a78bfa]" />
          <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider">OpenRouter API Key</h2>
          {userData?.hasOpenrouterKey && (
            <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-semibold">Active</span>
          )}
        </div>
        <p className="text-xs text-[#555] mb-3">
          Use your own OpenRouter key to unlock all models and remove rate limits. Leave blank to use Spork&apos;s shared key.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showOrKey ? "text" : "password"}
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              placeholder={userData?.hasOpenrouterKey ? "Key saved — enter new key to replace" : "sk-or-..."}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-2xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a] pr-9"
            />
            <button
              type="button"
              onClick={() => setShowOrKey((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#aaa] transition-colors"
            >
              {showOrKey ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          <button
            onClick={handleSaveOpenrouterKey}
            disabled={savingOrKey}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] hover:bg-[#9061f9] text-white text-sm font-semibold rounded-2xl transition-colors disabled:opacity-50 shrink-0"
          >
            <Save size={13} />
            {orKeySaved ? "Saved!" : savingOrKey ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* API Tokens */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Key size={14} className="text-[#a78bfa]" />
            <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider">API Tokens</h2>
          </div>
          <button
            onClick={() => setShowTokenForm((v) => !v)}
            className="flex items-center gap-1 text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
          >
            <Plus size={12} /> New token
          </button>
        </div>
        <p className="text-xs text-[#555] mb-3">
          Use these tokens to access Spork from the browser extension, CLI, or MCP server.
          Tokens are shown once — copy them immediately.
        </p>

        {showTokenForm && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTokenLabel}
              onChange={(e) => setNewTokenLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateToken(); }}
              placeholder="e.g. Chrome Extension, Claude Code MCP"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-2xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a]"
            />
            <button
              onClick={handleCreateToken}
              disabled={creatingToken || !newTokenLabel.trim()}
              className="px-3 py-2 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-2xl text-sm hover:bg-[#a78bfa]/20 transition-colors disabled:opacity-50"
            >
              {creatingToken ? "Creating…" : "Create"}
            </button>
          </div>
        )}

        {revealedToken && (
          <div className="mb-3 p-3 bg-green-900/20 border border-green-500/30 rounded-2xl">
            <p className="text-xs text-green-400 font-semibold mb-1">Token created — copy it now, it won&apos;t be shown again:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-green-300 break-all font-mono">{revealedToken}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(revealedToken); }}
                className="shrink-0 p-1.5 text-green-400 hover:text-green-300"
              >
                <Copy size={12} />
              </button>
              <button onClick={() => setRevealedToken(null)} className="shrink-0 p-1.5 text-[#555]">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {tokens.length === 0 ? (
          <p className="text-xs text-[#444] text-center py-4">No tokens yet.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-2 bg-[#111] border border-[#2a2a2a] rounded-2xl px-3 py-2 group">
                <div>
                  <p className="text-sm text-[#ccc] font-medium">{t.label}</p>
                  <p className="text-xs text-[#555]">
                    {t.lastUsedAt
                      ? `Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                      : `Created ${new Date(t.createdAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeToken(t.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-[#555] hover:text-red-400 transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Memory */}
      {(currentTier !== "FREE") && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} className="text-[#a78bfa]" />
            <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider">Spork Memory</h2>
          </div>
          <p className="text-xs text-[#555] mb-3">Facts Spork remembers about you — injected into every conversation.</p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddMemory(); } }}
              placeholder="I prefer TypeScript over JavaScript…"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-2xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a]"
            />
            <button
              onClick={handleAddMemory}
              className="px-3 py-2 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-2xl text-sm hover:bg-[#a78bfa]/20 transition-colors"
            >
              Add
            </button>
          </div>
          {memories.length === 0 ? (
            <p className="text-xs text-[#444] text-center py-4">No memories yet.</p>
          ) : (
            <div className="space-y-2">
              {memories.map((m) => (
                <div key={m.id} className="flex items-start justify-between gap-2 bg-[#111] border border-[#2a2a2a] rounded-2xl px-3 py-2 group">
                  <p className="text-sm text-[#ccc] leading-relaxed">{m.content}</p>
                  <button
                    onClick={() => handleDeleteMemory(m.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 shrink-0 text-[#555] hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Clerk profile */}
      <div>
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-3">Account</h2>
        {clerkEnabled ? (
          <UserProfile
            appearance={{
              variables: {
                colorPrimary: "#a78bfa",
                colorBackground: "#111111",
                colorInputBackground: "#1a1a1a",
                colorInputText: "#f0f0f0",
                colorText: "#f0f0f0",
                colorTextSecondary: "#888888",
                borderRadius: "12px",
              },
              elements: { card: "shadow-none border-0", rootBox: "w-full" },
            }}
          />
        ) : (
          <div className="rounded-2xl border border-[#2a2a2a] bg-[#111] p-4">
            <p className="text-sm text-[#888]">
              Clerk keys are not configured. Add them to `.env.local` to enable account management.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
