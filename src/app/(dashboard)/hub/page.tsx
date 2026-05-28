"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  BookMarked,
  Plus,
  Trash2,
  Globe,
  Lock,
  Eye,
  Search,
  X,
} from "lucide-react";
import { cn, truncate } from "@/lib/utils";

type HubTab = "prompts" | "saved";

interface PublicPrompt {
  id: string;
  title: string;
  content: string;
  uses: number;
  user: { username: string | null; email: string };
}

interface MyPrompt {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  uses: number;
  createdAt: string;
}

export default function HubPage() {
  const router = useRouter();
  const [tab, setTab] = useState<HubTab>("prompts");
  const [publicPrompts, setPublicPrompts] = useState<PublicPrompt[]>([]);
  const [myPrompts, setMyPrompts] = useState<MyPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  // Save prompt form
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newPublic, setNewPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/prompts?scope=public").then((r) => r.json()),
      fetch("/api/prompts?scope=mine").then((r) => r.json()),
    ])
      .then(([pub, mine]) => {
        setPublicPrompts(pub);
        setMyPrompts(mine);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleUsePrompt = async (prompt: PublicPrompt) => {
    // Increment use count (fire and forget)
    fetch(`/api/prompts/${prompt.id}`, { method: "POST" }).catch(() => {});

    // Create a new conversation with this prompt
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-oss-120b:free" }),
    });
    const conv = await res.json();
    router.push(`/chat/${conv.id}?q=${encodeURIComponent(prompt.content)}`);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, isPublic: newPublic }),
      });
      const saved = await res.json();
      setMyPrompts((prev) => [saved, ...prev]);
      setNewTitle("");
      setNewContent("");
      setNewPublic(false);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const res = await fetch("/api/prompts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setMyPrompts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">Spork Hub</h1>
        <p className="text-sm text-[#666] mt-1">
          Community prompts — discover, save, and share what works.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-full border border-[#2a2a2a] w-fit mb-6">
        {([["prompts", "Trending Prompts"], ["saved", "My Prompts"]] as const).map(
          ([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-colors",
                tab === id
                  ? "bg-[#2a2a2a] text-white font-medium"
                  : "text-[#666] hover:text-[#aaa]"
              )}
            >
              {label}
            </button>
          )
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
        </div>
      ) : tab === "prompts" ? (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-2xl">
            <Search size={13} className="text-[#555] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts..."
              className="flex-1 bg-transparent text-sm text-[#ccc] placeholder-[#555] outline-none"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-[#555] hover:text-white transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {publicPrompts.length === 0 ? (
            <p className="text-center text-[#555] text-sm py-12">
              No public prompts yet. Be the first to share one!
            </p>
          ) : (() => {
            const filtered = query.trim()
              ? publicPrompts.filter(
                  (p) =>
                    p.title.toLowerCase().includes(query.toLowerCase()) ||
                    p.content.toLowerCase().includes(query.toLowerCase())
                )
              : publicPrompts;
            if (filtered.length === 0) {
              return (
                <p className="text-center text-[#555] text-sm py-8">
                  No prompts match &ldquo;{query}&rdquo;
                </p>
              );
            }
            return filtered.map((p) => {
              const handle = p.user.username ?? p.user.email.split("@")[0];
              return (
                <div
                  key={p.id}
                  className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-4 group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                    <div className="flex items-center gap-1 shrink-0 text-[10px] text-[#555]">
                      <Eye size={10} />
                      {p.uses} uses
                    </div>
                  </div>
                  <p className="text-xs text-[#666] mb-3 leading-relaxed">
                    {truncate(p.content, 160)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#444]">@{handle}</span>
                    <button
                      onClick={() => handleUsePrompt(p)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#a78bfa]/10 text-[#a78bfa] text-xs rounded-full hover:bg-[#a78bfa]/20 transition-colors font-medium"
                    >
                      <Zap size={11} />
                      Try this
                    </button>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Add prompt button */}
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20 rounded-2xl text-sm font-medium hover:bg-[#a78bfa]/20 transition-colors"
          >
            <Plus size={14} />
            Save a prompt
          </button>

          {showForm && (
            <form
              onSubmit={handleSavePrompt}
              className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-4 space-y-3"
            >
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Prompt title"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a]"
              />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="The prompt content..."
                rows={3}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none resize-none focus:border-[#3a3a3a]"
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-[#666] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newPublic}
                    onChange={(e) => setNewPublic(e.target.checked)}
                    className="accent-[#a78bfa]"
                  />
                  Share publicly to Hub
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 text-xs text-[#666] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1.5 bg-[#a78bfa] text-white text-xs rounded-full hover:bg-[#9061f9] transition-colors disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {myPrompts.length === 0 ? (
            <p className="text-center text-[#555] text-sm py-8">
              No saved prompts yet.
            </p>
          ) : (
            myPrompts.map((p) => (
              <div
                key={p.id}
                className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-4 group"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-white text-sm">{p.title}</h3>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#555]">
                      {p.isPublic ? (
                        <span className="flex items-center gap-0.5 text-[#a78bfa]">
                          <Globe size={9} /> Public
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <Lock size={9} /> Private
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => handleDeletePrompt(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#555] hover:text-red-400 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#666] mb-3">{truncate(p.content, 120)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#444]">{p.uses} uses</span>
                  <Link
                    href={`/chat/new?q=${encodeURIComponent(p.content)}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      const res = await fetch("/api/conversations", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ model: "openai/gpt-oss-120b:free" }),
                      });
                      const conv = await res.json();
                      router.push(`/chat/${conv.id}?q=${encodeURIComponent(p.content)}`);
                    }}
                    className="flex items-center gap-1 text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
                  >
                    <BookMarked size={11} />
                    Use
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
