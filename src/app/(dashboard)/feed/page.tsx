"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Heart, Eye, GitFork, Sparkles } from "lucide-react";
import { cn, truncate, formatDate } from "@/lib/utils";
import { getAgent } from "@/lib/agents";
import { ALL_MODELS } from "@/lib/models";

type Filter = "new" | "top";
type Since = "all" | "today" | "week";

interface FeedConversation {
  id: string;
  title: string;
  model: string;
  agentId: string | null;
  likes: number;
  views: number;
  updatedAt: string;
  messages: Array<{ content: string; role: string }>;
  user: { email: string; username: string | null };
  liked?: boolean;
}

function getModelName(modelId: string): string {
  return ALL_MODELS.find((m) => m.id === modelId)?.name ?? modelId.split("/").pop() ?? modelId;
}

export default function FeedPage() {
  const [conversations, setConversations] = useState<FeedConversation[]>([]);
  const [filter, setFilter] = useState<Filter>("new");
  const [since, setSince] = useState<Since>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async (f: Filter, s: Since, c: string | null, append = false) => {
    setLoading(true);
    const params = new URLSearchParams({ filter: f, since: s });
    if (c) params.set("cursor", c);
    const res = await fetch(`/api/feed?${params}`);
    const data = await res.json();
    setConversations((prev) => append ? [...prev, ...data.conversations] : data.conversations);
    setCursor(data.nextCursor);
    setHasMore(!!data.nextCursor);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFeed(filter, since, null);
  }, [filter, since, loadFeed]);

  const handleLike = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv || conv.liked) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, likes: c.likes + 1, liked: true } : c))
    );
    try {
      const res = await fetch(`/api/conversations/${id}/like`, { method: "POST" });
      if (!res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, likes: c.likes - 1, liked: false } : c))
        );
      }
    } catch {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, likes: c.likes - 1, liked: false } : c))
      );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Feed</h1>
          <p className="text-sm text-[#666] mt-1">Public conversations from the Spork community</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time filter */}
          <div className="flex gap-0.5 bg-[#1a1a1a] p-1 rounded-full border border-[#2a2a2a]">
            {(["all", "week", "today"] as Since[]).map((s) => (
              <button
                key={s}
                onClick={() => setSince(s)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs capitalize transition-colors",
                  since === s ? "bg-[#2a2a2a] text-white font-medium" : "text-[#555] hover:text-[#aaa]"
                )}
              >
                {s === "all" ? "All time" : s === "week" ? "This week" : "Today"}
              </button>
            ))}
          </div>
          {/* Sort filter */}
          <div className="flex gap-0.5 bg-[#1a1a1a] p-1 rounded-full border border-[#2a2a2a]">
            {(["new", "top"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm capitalize transition-colors",
                  filter === f ? "bg-[#2a2a2a] text-white font-medium" : "text-[#666] hover:text-[#aaa]"
                )}
              >
                {f === "top" ? "🔥 Top" : "✨ New"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {conversations.length === 0 && !loading ? (
        <div className="text-center py-16">
          <p className="text-[#555] text-sm">No public conversations yet.</p>
          <p className="text-[#444] text-xs mt-1">
            Share your chats to Feed from any conversation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => {
            const agent = conv.agentId ? getAgent(conv.agentId) : null;
            const firstMessage = conv.messages[0];
            const modelName = getModelName(conv.model);
            const authorHandle = conv.user.username ?? conv.user.email.split("@")[0];

            return (
              <Link
                key={conv.id}
                href={`/share/${conv.id}`}
                className="block bg-[#111] border border-[#2a2a2a] rounded-2xl p-4 hover:border-[#3a3a3a] transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {agent && (
                      <span className="text-base">{agent.emoji}</span>
                    )}
                    <h3 className="font-semibold text-white text-sm truncate">
                      {conv.title}
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#555] shrink-0">
                    {formatDate(conv.updatedAt)}
                  </span>
                </div>

                {firstMessage && (
                  <p className="text-xs text-[#666] mb-3 leading-relaxed">
                    {truncate(firstMessage.content, 140)}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[10px] text-[#555]">
                  <span className="bg-[#1a1a1a] border border-[#2a2a2a] px-1.5 py-0.5 rounded">
                    {modelName}
                  </span>
                  {agent && (
                    <span className="flex items-center gap-1" style={{ color: agent.accentColor }}>
                      {agent.emoji} {agent.name}
                    </span>
                  )}
                  <span className="text-[#444]">@{authorHandle}</span>
                  <div className="flex items-center gap-3 ml-auto">
                    <span className="flex items-center gap-1">
                      <Eye size={10} />
                      {conv.views}
                    </span>
                    <button
                      onClick={(e) => { e.preventDefault(); handleLike(conv.id); }}
                      className={`flex items-center gap-1 transition-colors ${conv.liked ? "text-pink-400" : "hover:text-pink-400"}`}
                      title={conv.liked ? "Liked" : "Like"}
                    >
                      <Heart size={10} fill={conv.liked ? "currentColor" : "none"} />
                      {conv.likes}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}

          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
            </div>
          )}

          {hasMore && !loading && (
            <button
              onClick={() => loadFeed(filter, since, cursor, true)}
              className="w-full py-3 text-sm text-[#666] hover:text-white transition-colors border border-[#2a2a2a] rounded-2xl"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
