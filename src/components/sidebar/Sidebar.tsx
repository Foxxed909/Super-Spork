"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  MessageSquare,
  Plus,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trash2,
  Bot,
  Rss,
  Search,
  Paintbrush,
  Mic,
  Brain,
  Store,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
}

interface UserData {
  tier: "FREE" | "SUPER_SPORK";
  dailyMessages: number;
  dailyLimit: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState(false);

  const fetchSidebarData = () => {
    setLoadError(false);
    Promise.all([
      fetch("/api/conversations").then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
    ])
      .then(([convs, user]) => {
        setConversations(convs);
        setUserData(user);
      })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    fetchSidebarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const startChat = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-oss-120b:free" }),
    });
    const conv = await res.json();
    router.push(`/chat/${conv.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (pathname === `/chat/${id}`) router.push("/");
  };

  const isSuperSpork = userData?.tier === "SUPER_SPORK";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#111] border-r border-[#2a2a2a] transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b border-[#2a2a2a]">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-white">
              {isSuperSpork ? (
                <>
                  <span className="text-[#a78bfa]">SUPER</span> SPORK
                </>
              ) : (
                "SPORK"
              )}
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#1a1a1a] transition-colors ml-auto"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </div>

      {/* New Chat */}
      <div className="p-2">
        <button
          onClick={startChat}
          className={cn(
            "flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm font-medium",
            "bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20",
            "hover:bg-[#a78bfa]/20 transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <Plus size={16} />
          {!collapsed && "New Chat"}
        </button>
      </div>

      {/* Conversations */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Search */}
          {conversations.length > 0 && (
            <div className="px-2 pt-1 pb-0.5">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
                <Search size={12} className="text-[#555] shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 bg-transparent text-xs text-[#ccc] placeholder-[#555] outline-none"
                />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
          {loadError ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-[#555] mb-2">Couldn&apos;t load</p>
              <button
                onClick={fetchSidebarData}
                className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-4 text-xs text-[#555] text-center">
              No conversations yet
            </p>
          ) : (
            conversations
              .filter((c) =>
                search.trim()
                  ? c.title.toLowerCase().includes(search.toLowerCase())
                  : true
              )
              .map((conv) => {
              const isActive = pathname === `/chat/${conv.id}`;
              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={cn(
                    "group flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-[#1e1e1e] text-white"
                      : "text-[#aaa] hover:bg-[#1a1a1a] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare size={14} className="shrink-0 text-[#555]" />
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">
                        {conv.title}
                      </p>
                      <p className="text-xs text-[#555] mt-0.5">
                        {formatDate(conv.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#555] hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </Link>
              );
            })
          )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="p-2 border-t border-[#2a2a2a] space-y-0.5">
        <Link
          href="/feed"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/feed"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Rss size={16} />
          {!collapsed && "Feed"}
        </Link>

        <Link
          href="/agents"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/agents"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Bot size={16} />
          {!collapsed && "Agents"}
        </Link>

        <Link
          href="/canvas"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/canvas"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Paintbrush size={16} />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              Canvas
              {!isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full font-medium">
                  PRO
                </span>
              )}
            </span>
          )}
        </Link>

        <Link
          href="/voice"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/voice"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Mic size={16} />
          {!collapsed && "Voice"}
        </Link>

        <Link
          href="/hub"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname.startsWith("/hub")
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Store size={16} />
          {!collapsed && "Hub"}
        </Link>

        <Link
          href="/code"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/code"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Code2 size={16} />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              Spork Code
              {!isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full font-medium">
                  PRO
                </span>
              )}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#888] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings size={16} />
          {!collapsed && "Settings"}
        </Link>

        {/* Tier badge */}
        {!collapsed && userData && (
          <div className="px-3 py-2 mt-1">
            {isSuperSpork ? (
              <div className="flex items-center gap-1.5 text-xs text-[#a78bfa]">
                <Sparkles size={12} />
                <span className="font-semibold">Super Spork</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#666]">
                  <span>
                    {userData.dailyMessages}/{userData.dailyLimit} messages
                  </span>
                  <span>today</span>
                </div>
                <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#a78bfa] rounded-full transition-all"
                    style={{
                      width: `${Math.min((userData.dailyMessages / userData.dailyLimit) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* User */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2",
            collapsed && "justify-center px-2"
          )}
        >
          <UserButton
            appearance={{
              variables: { colorPrimary: "#a78bfa" },
              elements: { avatarBox: "w-7 h-7" },
            }}
          />
          {!collapsed && (
            <span className="text-xs text-[#666]">Account</span>
          )}
        </div>
      </div>
    </aside>
  );
}
