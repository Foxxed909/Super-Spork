"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Copy, Check, RefreshCw, AlertCircle, Pin, ThumbsUp, ThumbsDown, Quote, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { highlightLanguages, highlightAliases } from "@/lib/highlight";
import { kindForLang, type Artifact } from "@/lib/artifacts";
import type { Message } from "ai";

// Stable, module-level plugin arrays so ReactMarkdown isn't handed fresh
// references (and a fresh highlight config) on every render.
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [
  [rehypeHighlight, { languages: highlightLanguages, aliases: highlightAliases }],
] as const;

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  sendError?: string | null;
  onRetry?: () => void;
  onRegenerate?: () => void;
  rawMode?: boolean;
  searchQuery?: string;
  pinnedMessageIds?: Set<string>;
  onPinToggle?: (id: string, pinned: boolean) => void;
  fontSize?: "compact" | "normal" | "large";
  onOpenArtifact?: (a: Artifact) => void;
}

const FONT_SIZE_CLASS: Record<string, string> = {
  compact: "text-xs",
  normal: "text-sm",
  large: "text-base",
};

export function MessageList({ messages, isLoading, sendError, onRetry, onRegenerate, rawMode, searchQuery, pinnedMessageIds, onPinToggle, fontSize = "normal", onOpenArtifact }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [thinkingTime, setThinkingTime] = useState(0);

  useEffect(() => {
    if (searchQuery) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, searchQuery]);

  useEffect(() => {
    if (!isLoading) { setThinkingTime(0); return; }
    const t = setInterval(() => setThinkingTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            What can I help with?
          </h2>
          <p className="text-[#666] text-sm max-w-sm">
            Ask anything. Spork uses the best open models to give you real answers.
          </p>
        </div>
      </div>
    );
  }

  const filteredMessages = searchQuery?.trim()
    ? messages.filter((m) => (m.content as string).toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className={cn("flex flex-col gap-6 px-4 py-6 max-w-3xl mx-auto w-full", FONT_SIZE_CLASS[fontSize])}>
      {searchQuery?.trim() && (
        <div className="text-xs text-[#555] text-center py-1">
          {filteredMessages.length} of {messages.length} messages match
        </div>
      )}
      {filteredMessages.map((msg, idx) => {
        const isLastAssistant =
          !isLoading &&
          msg.role === "assistant" &&
          idx === filteredMessages.length - 1;
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            rawMode={rawMode}
            searchQuery={searchQuery}
            initialPinned={pinnedMessageIds?.has(msg.id)}
            onPinToggle={onPinToggle}
            isLast={isLastAssistant}
            onRegenerate={isLastAssistant ? onRegenerate : undefined}
            onOpenArtifact={onOpenArtifact}
          />
        );
      })}
      {isLoading && (
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-[#a78bfa]">S</span>
          </div>
          <div className="flex-1 pt-1">
            <div className="streaming-cursor text-[#888] text-sm" />
            {thinkingTime > 2 && (
              <p className="text-[11px] text-[#444] mt-1">{thinkingTime}s</p>
            )}
          </div>
        </div>
      )}
      {sendError && !isLoading && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <AlertCircle size={14} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-400 flex-1">{sendError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors font-medium shrink-0"
            >
              <RefreshCw size={12} />
              Retry
            </button>
          )}
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded-sm">{part}</mark>
    ) : part
  );
}

function MessageBubble({
  message,
  rawMode,
  searchQuery,
  initialPinned,
  onPinToggle,
  isLast,
  onRegenerate,
  onOpenArtifact,
}: {
  message: Message;
  rawMode?: boolean;
  searchQuery?: string;
  initialPinned?: boolean;
  onPinToggle?: (id: string, pinned: boolean) => void;
  isLast?: boolean;
  onRegenerate?: () => void;
  onOpenArtifact?: (a: Artifact) => void;
}) {
  const isUser = message.role === "user";
  const [quoteCopied, setQuoteCopied] = useState(false);

  const handleCopyAsQuote = () => {
    const lines = (message.content as string)
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
    navigator.clipboard.writeText(lines);
    setQuoteCopied(true);
    setTimeout(() => setQuoteCopied(false), 2000);
  };

  const wordCount = !isUser
    ? (message.content as string).split(/\s+/).filter(Boolean).length
    : 0;
  const readingTimeSec = Math.round((wordCount / 200) * 60);
  const readingTimeLabel =
    readingTimeSec < 60
      ? `${readingTimeSec}s read`
      : `~${Math.ceil(readingTimeSec / 60)}m read`;
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(initialPinned ?? false);
  const [reaction, setReaction] = useState<"up" | "down" | null>(() => {
    if (typeof window === "undefined") return null;
    return (localStorage.getItem(`reaction:${message.id}`) as "up" | "down") ?? null;
  });

  const handleReaction = (r: "up" | "down") => {
    const next = reaction === r ? null : r;
    setReaction(next);
    if (next) localStorage.setItem(`reaction:${message.id}`, next);
    else localStorage.removeItem(`reaction:${message.id}`);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePin = async () => {
    const next = !pinned;
    setPinned(next);
    onPinToggle?.(message.id, next);
    try {
      await fetch(`/api/messages/${message.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
    } catch {
      setPinned(!next);
      onPinToggle?.(message.id, !next);
    }
  };

  const createdAt = (message as { createdAt?: string }).createdAt;
  const timeLabel = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className={cn("flex gap-3 group/msg", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
          isUser
            ? "bg-[#222] text-[#666]"
            : "bg-[#a78bfa]/15 border border-[#a78bfa]/25 text-[#a78bfa]"
        )}
      >
        {isUser ? "U" : "S"}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0", isUser && "flex flex-col items-end")}>
        {isUser ? (
          <div className="inline-block max-w-[85%] bg-[#1a1a2a] border border-[#2a2a3e] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-[#ddd]">
            {searchQuery ? highlightText(message.content as string, searchQuery) : (message.content as string)}
          </div>
        ) : (
          <div className="relative">
            {rawMode ? (
              <pre className="text-sm text-[#ccc] whitespace-pre-wrap font-mono leading-relaxed">
                {searchQuery ? highlightText(message.content as string, searchQuery) : (message.content as string)}
              </pre>
            ) : (
              <div className="prose text-sm leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={REMARK_PLUGINS}
                  rehypePlugins={REHYPE_PLUGINS as never}
                  components={{
                    pre: ({ children, ...props }) => (
                      <CodeBlock {...props} onOpenArtifact={onOpenArtifact}>{children}</CodeBlock>
                    ),
                  }}
                >
                  {message.content as string}
                </ReactMarkdown>
              </div>
            )}
            {/* Per-message action bar */}
            <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
              <button
                onClick={handleCopyMessage}
                title="Copy message"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-[#555] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors"
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleCopyAsQuote}
                title="Copy as blockquote"
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-[#555] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors"
              >
                {quoteCopied ? <Check size={11} /> : <Quote size={11} />}
                {quoteCopied ? "Copied" : "Quote"}
              </button>
              <button
                onClick={handlePin}
                title={pinned ? "Unpin" : "Pin message"}
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition-colors",
                  pinned
                    ? "text-purple-400 bg-purple-400/10"
                    : "text-[#555] hover:text-purple-400 hover:bg-purple-400/10"
                )}
              >
                <Pin size={11} />
                {pinned ? "Pinned" : "Pin"}
              </button>
              {/* Reactions */}
              <button
                onClick={() => handleReaction("up")}
                title="Good response"
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[11px] transition-colors",
                  reaction === "up"
                    ? "text-green-400 bg-green-400/10"
                    : "text-[#555] hover:text-green-400 hover:bg-green-400/10"
                )}
              >
                <ThumbsUp size={11} />
              </button>
              <button
                onClick={() => handleReaction("down")}
                title="Bad response"
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[11px] transition-colors",
                  reaction === "down"
                    ? "text-red-400 bg-red-400/10"
                    : "text-[#555] hover:text-red-400 hover:bg-red-400/10"
                )}
              >
                <ThumbsDown size={11} />
              </button>
              {isLast && onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] text-[#555] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10 transition-colors"
                >
                  <RefreshCw size={11} />
                  Regen
                </button>
              )}
              {wordCount > 40 && (
                <span className="text-[10px] text-[#3a3a3a] ml-auto tabular-nums">
                  {wordCount.toLocaleString()} · {readingTimeLabel}
                </span>
              )}
              {timeLabel && (
                <span className="text-[10px] text-[#444] ml-1">{timeLabel}</span>
              )}
            </div>
          </div>
        )}
        {/* User message timestamp */}
        {isUser && timeLabel && (
          <span className="text-[10px] text-[#444] mt-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
            {timeLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Pull the `language-*` token from either the <pre> className or its child
// <code> element (rehype-highlight puts the class on <code>, not <pre>).
function detectLang(className: string | undefined, children: React.ReactNode): string | undefined {
  const fromPre = (className ?? "").match(/language-(\w+)/)?.[1];
  if (fromPre) return fromPre;
  const child = React.Children.toArray(children)[0];
  if (React.isValidElement(child)) {
    const childClass = (child.props as { className?: string }).className ?? "";
    return childClass.match(/language-(\w+)/)?.[1];
  }
  return undefined;
}

function CodeBlock({
  children,
  className,
  onOpenArtifact,
  ...props
}: React.HTMLAttributes<HTMLPreElement> & { onOpenArtifact?: (a: Artifact) => void }) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    const text = ref.current?.textContent ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lang = detectLang(className, children);
  const artifactKind = kindForLang(lang);

  const handleOpenPreview = () => {
    if (!artifactKind || !lang) return;
    const code = ref.current?.textContent ?? "";
    onOpenArtifact?.({ kind: artifactKind, lang, code });
  };

  return (
    <div className="relative group/code my-3 rounded-xl overflow-hidden border border-[#2a2a2a]">
      {lang && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] border-b border-[#2a2a2a]">
          <span className="text-[10px] font-mono text-[#666] uppercase tracking-wider">{lang}</span>
          <div className="flex items-center gap-3">
            {artifactKind && onOpenArtifact && (
              <button
                onClick={handleOpenPreview}
                title="Render live in preview panel"
                className="flex items-center gap-1 text-[10px] text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
              >
                <Play size={11} />
                Open in preview
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] text-[#555] hover:text-[#a78bfa] transition-colors"
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
      <pre ref={ref} {...props} className={cn("!mt-0 !mb-0 !rounded-none", className)}>
        {children}
      </pre>
      {!lang && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-[#2a2a2a] text-[#888] hover:text-white opacity-0 group-hover/code:opacity-100 transition-all"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}
