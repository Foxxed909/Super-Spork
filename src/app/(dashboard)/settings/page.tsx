"use client";

import { useEffect, useState } from "react";
import { UserProfile } from "@clerk/nextjs";
import { Sparkles, CheckCircle2, Zap, Save, Brain, Trash2 } from "lucide-react";
import { FREE_DAILY_LIMIT, FREE_MODELS, PAID_MODELS } from "@/lib/models";

interface UserData {
  tier: "FREE" | "SUPER_SPORK";
  dailyMessages: number;
  dailyLimit: number;
  customInstructions: string;
}

export default function SettingsPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memories, setMemories] = useState<Array<{ id: string; content: string; createdAt: string }>>([]);
  const [newMemory, setNewMemory] = useState("");

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        setUserData(data);
        setInstructions(data.customInstructions ?? "");
      })
      .catch(() => {});

    fetch("/api/memory")
      .then((r) => r.json())
      .then(setMemories)
      .catch(() => {});
  }, []);

  const handleSaveInstructions = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customInstructions: instructions }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
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

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/upgrade", { method: "POST" });
      if (!res.ok) throw new Error("Upgrade request failed");
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setUpgrading(false);
    }
  };

  const isSuperSpork = userData?.tier === "SUPER_SPORK";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

      {/* Tier card */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-3">
          Your Plan
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Free */}
          <div
            className={`p-5 rounded-2xl border ${!isSuperSpork ? "border-[#a78bfa]/40 bg-[#a78bfa]/5" : "border-[#2a2a2a] bg-[#111]"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-white">Spork Free</span>
              {!isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-2 py-0.5 rounded-full font-semibold">
                  CURRENT
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-white mb-1">$0</p>
            <p className="text-xs text-[#666] mb-4">Forever free</p>
            <ul className="space-y-2 text-xs text-[#888]">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#555]" />
                {FREE_DAILY_LIMIT} messages/day
              </li>
              {FREE_MODELS.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#555]" />
                  {m.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Super Spork */}
          <div
            className={`p-5 rounded-2xl border ${isSuperSpork ? "border-[#a78bfa]/40 bg-[#a78bfa]/5" : "border-[#2a2a2a] bg-[#111]"}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#a78bfa]" />
                <span className="font-bold text-white">Super Spork</span>
              </div>
              {isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-2 py-0.5 rounded-full font-semibold">
                  CURRENT
                </span>
              )}
            </div>
            <p className="text-2xl font-black text-white mb-1">$20</p>
            <p className="text-xs text-[#666] mb-4">per month</p>
            <ul className="space-y-2 text-xs text-[#888] mb-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#a78bfa]" />
                Unlimited messages
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#a78bfa]" />
                Spork Code (coding assistant)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-[#a78bfa]" />
                File & image uploads
              </li>
              {PAID_MODELS.slice(0, 4).map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-[#a78bfa]" />
                  {m.name}
                </li>
              ))}
              <li className="flex items-center gap-2 text-[#666]">
                <Zap size={10} />+ {PAID_MODELS.length} more models
              </li>
            </ul>
            {!isSuperSpork && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="w-full py-2 bg-[#a78bfa] hover:bg-[#9061f9] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                {upgrading ? "Redirecting..." : "Upgrade Now"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-1">
          Custom Instructions
        </h2>
        <p className="text-xs text-[#555] mb-3">
          Tell Spork about yourself. This is injected into every conversation.
        </p>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. I'm a senior TypeScript developer. Prefer concise answers. Always use functional React patterns."
          rows={4}
          className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#444] resize-none outline-none focus:border-[#3a3a3a] transition-colors"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSaveInstructions}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] hover:bg-[#9061f9] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            <Save size={13} />
            {saved ? "Saved!" : saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Memory */}
      {isSuperSpork && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={14} className="text-[#a78bfa]" />
            <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider">
              Spork Memory
            </h2>
          </div>
          <p className="text-xs text-[#555] mb-3">
            Facts Spork remembers about you. These are injected into every conversation.
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMemory();
                }
              }}
              placeholder="I prefer TypeScript over JavaScript..."
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a]"
            />
            <button
              onClick={handleAddMemory}
              className="px-3 py-2 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-xl text-sm hover:bg-[#a78bfa]/20 transition-colors"
            >
              Add
            </button>
          </div>
          {memories.length === 0 ? (
            <p className="text-xs text-[#444] text-center py-4">
              No memories yet. Add facts about yourself.
            </p>
          ) : (
            <div className="space-y-2">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start justify-between gap-2 bg-[#111] border border-[#2a2a2a] rounded-xl px-3 py-2 group"
                >
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
        <h2 className="text-sm font-semibold text-[#666] uppercase tracking-wider mb-3">
          Account
        </h2>
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
            elements: {
              card: "shadow-none border-0",
              rootBox: "w-full",
            },
          }}
        />
      </div>
    </div>
  );
}
