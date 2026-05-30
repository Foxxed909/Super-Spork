"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useChat } from "ai/react";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { MessageInput } from "@/components/chat/MessageInput";
import { AgentSelector } from "@/components/agents/AgentSelector";
import { ForkButton } from "@/components/chat/ForkButton";
import { DEFAULT_FREE_MODEL } from "@/lib/models";
import { Sparkles, Share2, Download, Globe, Lock, Brain, Link2, FileJson, BarChart2, Code2, RefreshCw, Check, Pencil, X, Search, ChevronsDown, ChevronsUp, Pin, Clipboard, ClipboardCheck, Type, BookOpen, Maximize2, Minimize2, Printer, Bell, StickyNote, Terminal, Trash2 } from "lucide-react";
import type { Message } from "ai";
import { findRenderableArtifacts, type Artifact } from "@/lib/artifacts";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";

// Lazily load the message renderer (react-markdown + highlight.js) so the chat
// shell and the layout's Clerk <UserButton> hydrate first instead of blocking on
// the heavy markdown subtree — which is what tripped Clerk's 10s mount timeout.
const MessageList = dynamic(
  () => import("@/components/chat/MessageList").then((m) => m.MessageList),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-[#444] text-sm">
        Loading conversation…
      </div>
    ),
  }
);

// The live-artifact preview panel is only needed once a user opens an artifact,
// so keep it off the initial compile/hydration path (CDN-in-iframe renderer).
const ArtifactPanel = dynamic(
  () => import("@/components/chat/ArtifactPanel").then((m) => m.ArtifactPanel),
  { ssr: false }
);

const PANEL_MIN = 320;
const PANEL_MAX = 840;

interface ConversationData {
  id: string;
  title: string;
  model: string;
  agentId: string | null;
  isPublic: boolean;
  messages: Array<{ id: string; role: string; content: string; pinned?: boolean }>;
}

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface UserData {
  tier: string;
  dailyMessages: number;
  dailyLimit: number;
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_FREE_MODEL);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [convTitle, setConvTitle] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [extractStatus, setExtractStatus] = useState<string | null>(null);
  const [webSearch, setWebSearch] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [regenStatus, setRegenStatus] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [msgSearch, setMsgSearch] = useState("");
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessageIds, setPinnedMessageIds] = useState<Set<string>>(new Set());
  const [copyAllDone, setCopyAllDone] = useState(false);
  const [tone, setTone] = useState<string>("default");
  const [focusMode, setFocusMode] = useState(false);
  const [showPromptPicker, setShowPromptPicker] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<Array<{ id: string; title: string; content: string }>>([]);
  const [fontSize, setFontSize] = useState<"compact" | "normal" | "large">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("spork:fontSize") as "compact" | "normal" | "large") ?? "normal";
    }
    return "normal";
  });
  const [sessionElapsed, setSessionElapsed] = useState("0s");
  const sessionStartRef = useRef(Date.now());
  const [showNotes, setShowNotes] = useState(false);
  const [convNotes, setConvNotes] = useState("");
  const [showSysPrompt, setShowSysPrompt] = useState(false);
  const [convSystemPrompt, setConvSystemPrompt] = useState("");
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = Number(localStorage.getItem("spork:artifactPanelW"));
      if (saved >= PANEL_MIN && saved <= PANEL_MAX) return saved;
    }
    return 480;
  });
  const autoOpenedRef = useRef<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const sentFirstRef = useRef(false);
  const autoTitledRef = useRef(false);
  const convTitleRef = useRef(convTitle);
  convTitleRef.current = convTitle;

  // Refs for experimental_prepareRequestBody so latest values are always captured
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const selectedAgentRef = useRef(selectedAgent);
  selectedAgentRef.current = selectedAgent;
  const webSearchRef = useRef(webSearch);
  webSearchRef.current = webSearch;
  const toneRef = useRef(tone);
  toneRef.current = tone;
  const convSystemPromptRef = useRef(convSystemPrompt);
  convSystemPromptRef.current = convSystemPrompt;

  useEffect(() => {
    Promise.all([
      fetch(`/api/conversations/${id}`).then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
    ])
      .then(([conv, user]: [ConversationData, UserData]) => {
        setSelectedModel(conv.model ?? DEFAULT_FREE_MODEL);
        setSelectedAgent(conv.agentId ?? null);
        setIsPublic(conv.isPublic ?? false);
        setConvTitle(conv.title ?? "Conversation");
        const validRoles = ["user", "assistant", "system", "data"] as const;
        setInitialMessages(
          conv.messages.map((m) => ({
            id: m.id,
            role: (validRoles.includes(m.role as Message["role"])
              ? m.role
              : "user") as Message["role"],
            content: m.content,
          }))
        );
        const pinned = new Set(conv.messages.filter((m) => m.pinned).map((m) => m.id));
        setPinnedMessageIds(pinned);
        setUserData(user);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [id]);

  const { messages, input, setInput, append, isLoading, stop, reload } = useChat({
    api: "/api/chat",
    experimental_prepareRequestBody: ({ messages: msgs, requestBody }) => ({
      ...(requestBody as object),
      messages: msgs,
      model: selectedModelRef.current,
      conversationId: id,
      agentId: selectedAgentRef.current,
      webSearch: webSearchRef.current,
      tone: toneRef.current !== "default" ? toneRef.current : undefined,
      convSystemPrompt: convSystemPromptRef.current || undefined,
    }),
    initialMessages,
    onError: (err) => {
      setSendError(err.message || "Something went wrong. Try again.");
    },
  });

  // Persist font size selection
  useEffect(() => {
    localStorage.setItem("spork:fontSize", fontSize);
  }, [fontSize]);

  // Load conversation notes + system prompt from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    setConvNotes(localStorage.getItem(`notes:${id}`) ?? "");
    setConvSystemPrompt(localStorage.getItem(`sysprompt:${id}`) ?? "");
  }, [id]);

  // Persist notes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (convNotes) localStorage.setItem(`notes:${id}`, convNotes);
    else localStorage.removeItem(`notes:${id}`);
  }, [id, convNotes]);

  // Persist system prompt
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (convSystemPrompt) localStorage.setItem(`sysprompt:${id}`, convSystemPrompt);
    else localStorage.removeItem(`sysprompt:${id}`);
  }, [id, convSystemPrompt]);

  // Session timer
  useEffect(() => {
    const interval = setInterval(() => {
      const s = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      if (s < 60) setSessionElapsed(`${s}s`);
      else if (s < 3600) setSessionElapsed(`${Math.floor(s / 60)}m ${s % 60}s`);
      else setSessionElapsed(`${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Browser notifications when response finishes in background tab
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading && messages.length > 0 && typeof window !== "undefined") {
      if (document.hidden && "Notification" in window && Notification.permission === "granted") {
        new Notification("Spork", { body: "Your AI response is ready!", icon: "/favicon.ico" });
      }
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, messages.length]);

  // Persist the artifact panel width across reloads.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("spork:artifactPanelW", String(panelWidth));
    }
  }, [panelWidth]);

  // Auto-open the latest renderable artifact when an assistant reply finishes.
  // Keyed by message id so we only auto-open once per message and never clobber
  // a panel the user already opened/closed for that same message.
  useEffect(() => {
    if (isLoading) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (autoOpenedRef.current === last.id) return;
    const artifacts = findRenderableArtifacts(last.content as string);
    if (artifacts.length === 0) return;
    autoOpenedRef.current = last.id;
    setActiveArtifact(artifacts[artifacts.length - 1]);
  }, [messages, isLoading]);

  // Drag-to-resize the artifact panel.
  const handlePanelDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = panelWidth;
    const onMove = (ev: MouseEvent) => {
      const next = startW + (startX - ev.clientX);
      setPanelWidth(Math.min(PANEL_MAX, Math.max(PANEL_MIN, next)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Auto-send ?q= first message after conversation loads
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q || !loaded || sentFirstRef.current || isLoading) return;
    sentFirstRef.current = true;
    router.replace(`/chat/${id}`);
    append({ role: "user", content: q });
  }, [loaded, searchParams, id, router, append, isLoading]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === "?" && !editing) { e.preventDefault(); setShowShortcuts((s) => !s); }
      if (e.key === "f" && !editing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setFocusMode((s) => !s); }
      if (e.key === "Escape" && !editing) { setFocusMode(false); }
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) { /* sidebar toggle handled in sidebar */ }
      if (e.key === "," && (e.ctrlKey || e.metaKey)) { e.preventDefault(); router.push("/settings"); }
      if (e.key === "/" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const ta = document.querySelector<HTMLTextAreaElement>("textarea");
        ta?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  // Auto-generate title after first AI response when title is still generic
  useEffect(() => {
    if (
      !isLoading &&
      messages.length >= 2 &&
      messages[messages.length - 1]?.role === "assistant" &&
      !autoTitledRef.current &&
      /^new conversation$/i.test(convTitle.trim())
    ) {
      autoTitledRef.current = true;
      handleRegenTitle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleTogglePublic = async () => {
    const res = await fetch(`/api/conversations/${id}/public`, { method: "PATCH" });
    if (res.ok) {
      const data = await res.json();
      setIsPublic(data.isPublic);
    }
  };

  const handleCopyAll = () => {
    const lines: string[] = [];
    for (const msg of messages) {
      if (msg.role === "user") lines.push(`You: ${msg.content}`);
      else if (msg.role === "assistant") lines.push(`Spork: ${msg.content}`);
    }
    navigator.clipboard.writeText(lines.join("\n\n")).catch(() => {});
    setCopyAllDone(true);
    setTimeout(() => setCopyAllDone(false), 2000);
  };

  const handleExport = () => {
    const lines: string[] = [`# ${convTitle}`, ""];
    for (const msg of messages) {
      if (msg.role === "user") {
        lines.push(`**You:** ${msg.content}`, "");
      } else if (msg.role === "assistant") {
        lines.push(`**Spork:** ${msg.content}`, "");
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${convTitle.slice(0, 40).replace(/[^a-z0-9]/gi, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const rows = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map(
        (m) =>
          `<div class="${m.role === "user" ? "user" : "ai"}"><strong>${m.role === "user" ? "You" : "Spork"}:</strong><br/>${(m.content as string).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</div>`
      )
      .join("<hr/>");
    w.document.write(
      `<!DOCTYPE html><html><head><title>${convTitle}</title><style>` +
        `body{font-family:Georgia,serif;max-width:800px;margin:2em auto;line-height:1.7;color:#111}` +
        `h1{font-size:1.4em;border-bottom:2px solid #eee;padding-bottom:.5em}` +
        `.user{background:#f5f5ff;padding:1em;border-radius:6px;margin:.5em 0}` +
        `.ai{padding:1em;margin:.5em 0}` +
        `hr{border:none;border-top:1px solid #eee;margin:1em 0}` +
        `@media print{body{margin:.5in}}` +
        `</style></head><body><h1>${convTitle}</h1>${rows}</body></html>`
    );
    w.document.close();
    w.print();
  };

  const handleExportJSON = () => {
    const data = {
      id,
      title: convTitle,
      model: selectedModel,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${convTitle.slice(0, 40).replace(/[^a-z0-9]/gi, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/share/${id}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleRegenTitle = async () => {
    if (messages.length < 2 || regenStatus) return;
    setRegenStatus("Generating...");
    try {
      const context = messages
        .slice(0, 6)
        .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
        .join("\n");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Summarize this conversation in 5-7 words as a title. Reply with ONLY the title, no punctuation:\n\n${context}`,
            },
          ],
          model: "openai/gpt-oss-120b:free",
        }),
      });
      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            raw += decoder.decode(value, { stream: true });
          }
        }
        // Extract text content from AI SDK data stream format
        const textMatch = raw.match(/0:"((?:[^"\\]|\\.)*)"/);
        const newTitle = textMatch
          ? textMatch[1].replace(/\\n/g, " ").replace(/\\"/g, '"').trim().slice(0, 60)
          : "";
        if (newTitle) {
          await fetch(`/api/conversations/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: newTitle }),
          });
          setConvTitle(newTitle);
          setRegenStatus("Updated!");
        } else {
          setRegenStatus("No change");
        }
      } else {
        setRegenStatus("Failed");
      }
    } catch {
      setRegenStatus("Error");
    }
    setTimeout(() => setRegenStatus(null), 2500);
  };

  const handleRenameTitle = async () => {
    const trimmed = editTitleValue.trim();
    setEditingTitle(false);
    if (!trimmed || trimmed === convTitle) return;
    setConvTitle(trimmed);
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  };

  const handleFetchSuggestions = async () => {
    if (messages.length < 2 || loadingSuggestions) return;
    setLoadingSuggestions(true);
    setSuggestions([]);
    try {
      const context = messages.slice(-4).map((m) => `${m.role}: ${m.content.slice(0, 300)}`).join("\n");
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Based on this conversation, suggest 3 concise follow-up questions the user might want to ask next. Reply with ONLY the 3 questions, one per line, no numbering or bullet points:\n\n${context}` }],
          model: "openai/gpt-oss-120b:free",
        }),
      });
      if (res.ok) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let raw = "";
        if (reader) { while (true) { const { done, value } = await reader.read(); if (done) break; raw += decoder.decode(value, { stream: true }); } }
        const matches = [...raw.matchAll(/0:"((?:[^"\\]|\\.)*)"/g)];
        const text = matches.map((m) => m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"')).join("").trim();
        const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 10 && l.length < 120).slice(0, 3);
        setSuggestions(lines);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    setSendError(null);
    setSuggestions([]);
    append({ role: "user", content: input });
    setInput("");
  };

  const handleRetry = () => {
    setSendError(null);
    reload();
  };

  const handleDeleteConversation = async () => {
    if (!confirm(`Delete "${convTitle}"? This cannot be undone.`)) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    router.push("/");
  };

  const isAtLimit =
    (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) === 0 &&
    (userData?.dailyMessages ?? 0) >= (userData?.dailyLimit ?? Infinity);

  const canExtractMemories = (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) >= 2;

  const handleExtractMemories = async () => {
    setExtractStatus("Extracting...");
    try {
      const res = await fetch("/api/memory/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractStatus("Failed to extract");
      } else if (data.saved === 0) {
        setExtractStatus(data.limitReached ? "Memory limit reached" : "No new memories found");
      } else {
        setExtractStatus(`${data.saved} memor${data.saved === 1 ? "y" : "ies"} saved`);
      }
    } catch {
      setExtractStatus("Error");
    }
    setTimeout(() => setExtractStatus(null), 3000);
  };

  if (!loaded) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1e1e1e] flex-wrap">
        {/* Focus mode: minimal header */}
        {focusMode ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-[#666] truncate max-w-xs">{convTitle}</span>
            <button
              onClick={() => setFocusMode(false)}
              title="Exit focus mode (F)"
              className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <Minimize2 size={14} />
            </button>
          </div>
        ) : null}
        {userData && !focusMode && (
          <>
            <ModelSelector
              value={selectedModel}
              onChange={setSelectedModel}
              userTier={userData.tier}
            />
            <AgentSelector
              value={selectedAgent}
              onChange={setSelectedAgent}
              userTier={userData.tier}
            />

            {/* Conversation title (inline edit) */}
            {convTitle && (
              <div className="hidden md:flex items-center gap-1 min-w-0 max-w-[200px]">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={editTitleValue}
                    onChange={(e) => setEditTitleValue(e.target.value)}
                    onBlur={handleRenameTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameTitle();
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                    className="flex-1 bg-[#1e1e1e] border border-[#a78bfa]/40 rounded-full px-2 py-0.5 text-xs text-white outline-none min-w-0"
                  />
                ) : (
                  <button
                    onClick={() => { setEditTitleValue(convTitle); setEditingTitle(true); }}
                    title="Rename conversation"
                    className="flex items-center gap-1 text-[#555] hover:text-[#aaa] transition-colors text-xs truncate max-w-[180px]"
                  >
                    <Pencil size={11} className="shrink-0" />
                    <span className="truncate">{convTitle}</span>
                  </button>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-1">
              {/* Message search */}
              <button
                onClick={() => { setShowMsgSearch((s) => !s); if (showMsgSearch) setMsgSearch(""); }}
                title="Search in conversation"
                className={`p-1.5 rounded-full transition-colors ${showMsgSearch ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <Search size={15} />
              </button>
              {/* Pinned messages */}
              {pinnedMessageIds.size > 0 && (
                <button
                  onClick={() => setShowPinned((s) => !s)}
                  title="View pinned messages"
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${showPinned ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
                >
                  <Pin size={12} />
                  {pinnedMessageIds.size}
                </button>
              )}
              {/* Stats */}
              <button
                onClick={() => setShowStats((s) => !s)}
                title="Conversation stats"
                className={`p-1.5 rounded-full transition-colors ${showStats ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <BarChart2 size={15} />
              </button>
              {/* Raw / markdown toggle */}
              <button
                onClick={() => setRawMode((r) => !r)}
                title={rawMode ? "Show markdown" : "Show raw text"}
                className={`p-1.5 rounded-full transition-colors ${rawMode ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <Code2 size={15} />
              </button>
              {/* Smart title regen */}
              <button
                onClick={handleRegenTitle}
                disabled={!!regenStatus || messages.length < 2}
                title={regenStatus ?? "Regenerate title with AI"}
                className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors disabled:opacity-40"
              >
                {regenStatus === "Updated!" ? <Check size={15} className="text-green-400" /> : <RefreshCw size={15} />}
              </button>
              {/* Font size toggle */}
              <button
                onClick={() => setFontSize((s) => s === "compact" ? "normal" : s === "normal" ? "large" : "compact")}
                title={`Font: ${fontSize} (click to cycle)`}
                className={`p-1.5 rounded-full transition-colors ${fontSize !== "normal" ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <Type size={15} />
              </button>
              {/* Tone selector */}
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                title="Response tone"
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] text-[11px] rounded-full px-2 py-0.5 outline-none hover:border-[#a78bfa]/40 cursor-pointer"
              >
                <option value="default">Tone</option>
                <option value="casual">Casual</option>
                <option value="professional">Pro</option>
                <option value="concise">Concise</option>
                <option value="creative">Creative</option>
              </select>
              {/* Prompt library */}
              <button
                onClick={() => {
                  if (!showPromptPicker && savedPrompts.length === 0) {
                    fetch("/api/prompts?scope=mine")
                      .then((r) => r.json())
                      .then((data) => setSavedPrompts(Array.isArray(data) ? data : []))
                      .catch(() => {});
                  }
                  setShowPromptPicker((s) => !s);
                }}
                title="Insert saved prompt"
                className={`p-1.5 rounded-full transition-colors ${showPromptPicker ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <BookOpen size={15} />
              </button>
              {/* Export MD */}
              <button
                onClick={handleExport}
                title="Export as Markdown"
                className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
              >
                <Download size={15} />
              </button>
              {/* Export JSON */}
              <button
                onClick={handleExportJSON}
                title="Export as JSON"
                className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
              >
                <FileJson size={15} />
              </button>
              {/* Export PDF */}
              <button
                onClick={handleExportPDF}
                title="Export as PDF (print)"
                className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
              >
                <Printer size={15} />
              </button>
              {/* Browser notifications */}
              {"Notification" in (typeof window !== "undefined" ? window : {}) && Notification.permission !== "granted" && (
                <button
                  onClick={() => Notification.requestPermission()}
                  title="Enable notifications for when responses finish"
                  className="p-1.5 rounded-full text-[#555] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors"
                >
                  <Bell size={15} />
                </button>
              )}
              {/* Copy share link */}
              {isPublic && (
                <button
                  onClick={handleCopyLink}
                  title="Copy share link"
                  className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                >
                  {linkCopied ? <Check size={15} className="text-green-400" /> : <Link2 size={15} />}
                </button>
              )}
              {/* Share to feed */}
              <button
                onClick={handleTogglePublic}
                title={isPublic ? "Remove from feed" : "Share to feed"}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                  isPublic
                    ? "text-[#a78bfa] bg-[#a78bfa]/10 hover:bg-[#a78bfa]/20"
                    : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"
                }`}
              >
                {isPublic ? <Globe size={13} /> : <Lock size={13} />}
                {isPublic ? "Public" : "Private"}
              </button>
              {canExtractMemories && (
                <button
                  onClick={handleExtractMemories}
                  disabled={!!extractStatus}
                  title="Extract memories from this conversation"
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                    extractStatus
                      ? "text-[#a78bfa] bg-[#a78bfa]/10"
                      : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <Brain size={13} />
                  {extractStatus ?? "Extract"}
                </button>
              )}
              {/* Notes */}
              <button
                onClick={() => setShowNotes((s) => !s)}
                title="Conversation notes"
                className={`p-1.5 rounded-full transition-colors ${showNotes ? "text-yellow-400 bg-yellow-400/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <StickyNote size={15} />
              </button>
              {/* Custom system prompt */}
              <button
                onClick={() => setShowSysPrompt((s) => !s)}
                title="Custom system prompt for this conversation"
                className={`p-1.5 rounded-full transition-colors ${convSystemPrompt ? "text-[#a78bfa] bg-[#a78bfa]/10" : showSysPrompt ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]"}`}
              >
                <Terminal size={15} />
              </button>
              {/* Focus mode */}
              <button
                onClick={() => setFocusMode(true)}
                title="Focus mode (F)"
                className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1a1a1a] transition-colors"
              >
                <Maximize2 size={15} />
              </button>
              <ForkButton
                conversationId={id}
                userTier={userData.tier}
                onForked={(newId) => router.push(`/chat/${newId}`)}
              />
              {/* Delete conversation */}
              <button
                onClick={handleDeleteConversation}
                title="Delete conversation"
                className="p-1.5 rounded-full text-[#555] hover:text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Stats panel */}
      {showStats && (
        <div className="flex items-start gap-6 px-4 py-3 bg-[#0d0d0d] border-b border-[#1e1e1e] text-xs text-[#555] flex-wrap">
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">Messages</span>
            <p className="text-white font-semibold mt-0.5">{messages.length}</p>
          </div>
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">Model</span>
            <p className="text-white font-semibold mt-0.5">{selectedModel.split("/").pop()}</p>
          </div>
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">Words</span>
            <p className="text-white font-semibold mt-0.5">
              {messages.reduce((acc, m) => acc + (m.content as string).split(/\s+/).filter(Boolean).length, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">Read time</span>
            <p className="text-white font-semibold mt-0.5">
              ~{Math.max(1, Math.ceil(messages.reduce((acc, m) => acc + (m.content as string).split(/\s+/).filter(Boolean).length, 0) / 200))} min
            </p>
          </div>
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">You / AI</span>
            <p className="text-white font-semibold mt-0.5">
              {messages.filter((m) => m.role === "user").length} / {messages.filter((m) => m.role === "assistant").length}
            </p>
          </div>
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">Pinned</span>
            <p className="text-white font-semibold mt-0.5">{pinnedMessageIds.size}</p>
          </div>
          {messages.filter((m) => m.role === "assistant").length > 0 && (
            <div>
              <span className="text-[#333] uppercase tracking-wider text-[10px]">Avg AI words</span>
              <p className="text-white font-semibold mt-0.5">
                {Math.round(
                  messages.filter((m) => m.role === "assistant")
                    .reduce((acc, m) => acc + (m.content as string).split(/\s+/).filter(Boolean).length, 0) /
                  messages.filter((m) => m.role === "assistant").length
                ).toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <span className="text-[#333] uppercase tracking-wider text-[10px]">Session</span>
            <p className="text-white font-semibold mt-0.5 tabular-nums">{sessionElapsed}</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleCopyAll}
              title="Copy all as text"
              className="flex items-center gap-1 text-[#444] hover:text-white transition-colors"
            >
              {copyAllDone ? <ClipboardCheck size={13} className="text-green-400" /> : <Clipboard size={13} />}
              <span className="text-[11px]">{copyAllDone ? "Copied!" : "Copy all"}</span>
            </button>
            <button onClick={() => setShowStats(false)} className="text-[#444] hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Message search bar */}
      {showMsgSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border-b border-[#1e1e1e]">
          <Search size={13} className="text-[#555] shrink-0" />
          <input
            autoFocus
            type="text"
            value={msgSearch}
            onChange={(e) => setMsgSearch(e.target.value)}
            placeholder="Search in conversation..."
            className="flex-1 bg-transparent text-xs text-white placeholder-[#444] outline-none"
          />
          {msgSearch && (
            <span className="text-[10px] text-[#555]">
              {messages.filter((m) => (m.content as string).toLowerCase().includes(msgSearch.toLowerCase())).length} results
            </span>
          )}
          <button onClick={() => { setMsgSearch(""); setShowMsgSearch(false); }} className="p-1 text-[#555] hover:text-white transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {/* Prompt library panel */}
      {showPromptPicker && (
        <div className="bg-[#0d0d0d] border-b border-[#2a2a2a] px-4 py-3 max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#a78bfa] uppercase tracking-wider font-semibold flex items-center gap-1">
              <BookOpen size={10} /> Saved Prompts
            </span>
            <button onClick={() => setShowPromptPicker(false)} className="text-[#444] hover:text-white transition-colors">
              <X size={12} />
            </button>
          </div>
          {savedPrompts.length === 0 ? (
            <p className="text-xs text-[#555]">No saved prompts yet. Save prompts from the Prompts page.</p>
          ) : (
            <div className="space-y-1">
              {savedPrompts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setInput(p.content); setShowPromptPicker(false); }}
                  className="w-full text-left text-xs px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#aaa] hover:border-[#a78bfa]/40 hover:text-white transition-colors"
                >
                  <span className="font-medium text-[#ddd] block mb-0.5">{p.title}</span>
                  <span className="text-[#555] line-clamp-1">{p.content.slice(0, 80)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notes panel */}
      {showNotes && (
        <div className="bg-[#0d0d0d] border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-yellow-400/80 uppercase tracking-wider font-semibold flex items-center gap-1">
              <StickyNote size={10} /> Conversation Notes
            </span>
            <button onClick={() => setShowNotes(false)} className="text-[#444] hover:text-white transition-colors">
              <X size={12} />
            </button>
          </div>
          <textarea
            value={convNotes}
            onChange={(e) => setConvNotes(e.target.value)}
            placeholder="Jot down notes, ideas, or reminders for this conversation…"
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-[#ccc] placeholder-[#444] resize-none outline-none focus:border-yellow-400/30 transition-colors"
            rows={4}
          />
        </div>
      )}

      {/* Custom system prompt panel */}
      {showSysPrompt && (
        <div className="bg-[#0d0d0d] border-b border-[#2a2a2a] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#a78bfa]/80 uppercase tracking-wider font-semibold flex items-center gap-1">
              <Terminal size={10} /> System Prompt Override
            </span>
            <button onClick={() => setShowSysPrompt(false)} className="text-[#444] hover:text-white transition-colors">
              <X size={12} />
            </button>
          </div>
          <textarea
            value={convSystemPrompt}
            onChange={(e) => setConvSystemPrompt(e.target.value)}
            placeholder="Add extra instructions for this conversation — appended to the base system prompt…"
            className="w-full bg-[#141414] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-xs text-[#ccc] placeholder-[#444] resize-none outline-none focus:border-[#a78bfa]/30 transition-colors"
            rows={3}
          />
          {convSystemPrompt && (
            <p className="text-[10px] text-[#a78bfa]/60 mt-1">Active — injected into every response in this conversation</p>
          )}
        </div>
      )}

      {/* Pinned messages panel */}
      {showPinned && pinnedMessageIds.size > 0 && (
        <div className="bg-[#0d0d0d] border-b border-[#2a2a2a] px-4 py-3 max-h-52 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-[#a78bfa] uppercase tracking-wider font-semibold flex items-center gap-1">
              <Pin size={10} /> Pinned messages ({pinnedMessageIds.size})
            </span>
            <button onClick={() => setShowPinned(false)} className="text-[#444] hover:text-white transition-colors">
              <X size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {messages.filter((m) => pinnedMessageIds.has(m.id)).map((m) => (
              <div key={m.id} className="text-xs text-[#aaa] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2">
                <span className="text-[10px] text-[#555] mr-2 uppercase">{m.role === "user" ? "You" : "Spork"}</span>
                {(m.content as string).slice(0, 200)}{(m.content as string).length > 200 ? "…" : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversation + optional live-artifact split panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left column: messages, suggestions, input */}
      <div className="flex flex-col flex-1 min-w-0">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto relative"
        ref={messagesContainerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
          setShowScrollBtn(!atBottom);
        }}
      >
        <MessageList
          messages={messages}
          isLoading={isLoading}
          sendError={sendError}
          onRetry={handleRetry}
          onRegenerate={reload}
          rawMode={rawMode}
          searchQuery={msgSearch || undefined}
          pinnedMessageIds={pinnedMessageIds}
          onPinToggle={(msgId, isPinned) =>
            setPinnedMessageIds((prev) => {
              const next = new Set(prev);
              if (isPinned) next.add(msgId);
              else next.delete(msgId);
              return next;
            })
          }
          fontSize={fontSize}
          onOpenArtifact={setActiveArtifact}
        />
        {showScrollBtn && (
          <div className="fixed bottom-28 right-6 z-10 flex flex-col gap-1">
            <button
              onClick={() => messagesContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
              className="p-2 bg-[#1e1e1e] border border-[#2a2a2a] text-[#888] hover:text-white rounded-full shadow-lg transition-colors hover:bg-[#2a2a2a]"
              title="Scroll to top"
            >
              <ChevronsUp size={16} />
            </button>
            <button
              onClick={() => messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: "smooth" })}
              className="p-2 bg-[#1e1e1e] border border-[#2a2a2a] text-[#888] hover:text-white rounded-full shadow-lg transition-colors hover:bg-[#2a2a2a]"
              title="Scroll to bottom"
            >
              <ChevronsDown size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Suggested follow-up questions */}
      {!isLoading && messages.length >= 2 && messages[messages.length - 1]?.role === "assistant" && (
        <div className="px-4 pb-1 max-w-3xl mx-auto w-full">
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2 py-2">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { setSuggestions([]); setInput(s); }}
                  className="text-xs px-3 py-1.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-full hover:border-[#a78bfa]/40 hover:text-white transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-1">
              <button
                onClick={handleFetchSuggestions}
                disabled={loadingSuggestions}
                className="text-xs text-[#444] hover:text-[#a78bfa] transition-colors"
              >
                {loadingSuggestions ? "Getting suggestions…" : "✦ Suggest follow-ups"}
              </button>
              {messages.length >= 4 && (
                <button
                  onClick={() => { setSuggestions([]); setInput("Summarize this conversation in 3 bullet points."); }}
                  className="text-xs text-[#444] hover:text-[#a78bfa] transition-colors"
                >
                  ↯ Summarize
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      {isAtLimit ? (
        <div className="px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 text-center">
            <p className="text-sm text-[#888] mb-3">
              Daily limit reached. Upgrade for unlimited messages.
            </p>
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] text-white rounded-full text-sm font-semibold hover:bg-[#9061f9] transition-colors"
            >
              <Sparkles size={14} />
              Upgrade to Super Spork
            </a>
          </div>
        </div>
      ) : (
        <MessageInput
          value={input}
          onChange={setInput}
          onSubmit={handleSend}
          onStop={stop}
          isLoading={isLoading}
          disabled={!userData}
          webSearch={webSearch}
          onWebSearchToggle={() => setWebSearch((w) => !w)}
          canWebSearch={(TIER_RANK[userData?.tier ?? "FREE"] ?? 0) >= 3}
          draftKey={id}
        />
      )}
      </div>
      {/* Right column: live artifact preview (hidden in focus mode) */}
      {activeArtifact && !focusMode && (
        <>
          <div
            onMouseDown={handlePanelDrag}
            className="w-1 shrink-0 cursor-col-resize bg-[#1e1e1e] hover:bg-[#a78bfa]/40 transition-colors"
            title="Drag to resize"
          />
          <div className="shrink-0 h-full" style={{ width: panelWidth }}>
            <ArtifactPanel
              artifact={activeArtifact}
              onClose={() => setActiveArtifact(null)}
            />
          </div>
        </>
      )}
      </div>
    </div>
  );
}
