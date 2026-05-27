"use client";

import { useEffect, useState, useRef } from "react";
import { useChat } from "ai/react";
import { DEFAULT_FREE_MODEL } from "@/lib/models";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Send,
  Square,
  Code2,
  FileText,
  Globe,
  Copy,
  RefreshCw,
  Download,
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

interface UserData {
  tier: "FREE" | "SUPER_SPORK";
}

type ArtifactType = "html" | "markdown" | "code";

interface Artifact {
  type: ArtifactType;
  lang?: string;
  content: string;
}

function parseArtifact(text: string): Artifact | null {
  const match = text.match(
    /<artifact\s+type="([^"]+)"(?:\s+lang="([^"]+)")?\s*>([\s\S]*?)<\/artifact>/i
  );
  if (!match) return null;
  return {
    type: match[1] as ArtifactType,
    lang: match[2],
    content: match[3].trim(),
  };
}

function ArtifactPreview({ artifact }: { artifact: Artifact }) {
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    const ext = artifact.type === "html" ? "html" : artifact.type === "markdown" ? "md" : artifact.lang ?? "txt";
    const mime = artifact.type === "html" ? "text/html" : "text/plain";
    const blob = new Blob([artifact.content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (artifact.type === "html") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#111]">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <Globe size={12} />
            <span>Live Preview</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setKey((k) => k + 1)}
              title="Refresh"
              className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
            >
              <RefreshCw size={12} />
            </button>
            <button
              onClick={handleDownload}
              title="Download"
              className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
            >
              <Download size={12} />
            </button>
            <button
              onClick={handleCopy}
              title="Copy source"
              className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
        <iframe
          key={key}
          srcDoc={artifact.content}
          className="flex-1 w-full bg-white"
          sandbox="allow-scripts"
          title="Canvas preview"
        />
      </div>
    );
  }

  if (artifact.type === "markdown") {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#111]">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <FileText size={12} />
            <span>Document</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              title="Download"
              className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
            >
              <Download size={12} />
            </button>
            <button
              onClick={handleCopy}
              title="Copy"
              className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {artifact.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // code type
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#111]">
        <div className="flex items-center gap-2 text-xs text-[#555]">
          <Code2 size={12} />
          <span>{artifact.lang ?? "code"}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            title="Download"
            className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleCopy}
            title="Copy"
            className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
          >
            {copied ? (
              <span className="text-xs text-green-400">Copied!</span>
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <pre className="p-4 text-sm text-[#f0f0f0] font-mono leading-relaxed whitespace-pre-wrap">
          <code>{artifact.content}</code>
        </pre>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!convId && userData?.tier === "SUPER_SPORK") {
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: DEFAULT_FREE_MODEL, title: "Canvas session" }),
      })
        .then((r) => r.json())
        .then((c) => setConvId(c.id))
        .catch(() => {});
    }
  }, [convId, userData]);

  const { messages, input, setInput, append, isLoading, stop } = useChat({
    api: "/api/chat",
    body: { model: DEFAULT_FREE_MODEL, conversationId: convId, canvas: true },
  });

  // Extract the latest artifact from assistant messages
  useEffect(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (lastAssistant) {
      const artifact = parseArtifact(lastAssistant.content);
      if (artifact) setCurrentArtifact(artifact);
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading || !convId) return;
    append({ role: "user", content: input });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!userData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  if (userData.tier !== "SUPER_SPORK") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center text-2xl">
          🎨
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Spork Canvas</h2>
          <p className="text-[#666] text-sm max-w-xs">
            Generate live HTML pages, documents, and code — all rendered in a live
            preview pane. Super Spork exclusive.
          </p>
        </div>
        <Link
          href="/settings"
          className="px-6 py-2.5 bg-[#a78bfa] hover:bg-[#9061f9] text-white rounded-xl text-sm font-semibold transition-colors"
        >
          Upgrade to Super Spork
        </Link>
      </div>
    );
  }

  const CANVAS_PROMPTS = [
    "Build me a beautiful landing page for a startup",
    "Create an interactive todo app with local storage",
    "Write a markdown report on the history of the internet",
    "Generate a CSS gradient background explorer",
  ];

  return (
    <div className="flex h-full">
      {/* Chat pane */}
      <div className="w-[360px] flex flex-col border-r border-[#2a2a2a] shrink-0">
        <div className="px-3 py-3 border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <span className="font-bold text-white text-sm">Spork Canvas</span>
            <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full">
              SUPER
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="pt-4">
              <p className="text-xs text-[#555] mb-3 text-center">
                Describe what you want to create
              </p>
              <div className="space-y-2">
                {CANVAS_PROMPTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      inputRef.current?.focus();
                    }}
                    className="w-full text-left text-xs px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#888] hover:text-white hover:border-[#3a3a3a] transition-colors leading-relaxed"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === "user";
              const displayContent = isUser
                ? m.content
                : m.content.replace(/<artifact[\s\S]*?<\/artifact>/gi, "").trim();

              if (!displayContent && !isUser) return null;

              return (
                <div
                  key={m.id}
                  className={cn("text-sm", isUser ? "text-right" : "text-left")}
                >
                  {isUser ? (
                    <span className="inline-block bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl rounded-tr-sm px-3 py-2 text-[#e0e0e0] max-w-[90%] text-left">
                      {m.content}
                    </span>
                  ) : (
                    <p className="text-[#aaa] leading-relaxed">{displayContent}</p>
                  )}
                </div>
              );
            })
          )}
          {isLoading && (
            <div className="flex gap-1 pt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#a78bfa]/50 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-[#2a2a2a]">
          <div className="flex items-end gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 focus-within:border-[#3a3a3a] transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!convId}
              placeholder="Describe your artifact..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-[#f0f0f0] placeholder-[#555] resize-none outline-none leading-relaxed"
              style={{ maxHeight: "120px" }}
            />
            <button
              onClick={isLoading ? stop : handleSend}
              disabled={!isLoading && (!input.trim() || !convId)}
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all",
                isLoading
                  ? "bg-red-500/20 text-red-400"
                  : input.trim() && convId
                  ? "bg-[#a78bfa] text-white"
                  : "bg-[#2a2a2a] text-[#555] cursor-not-allowed"
              )}
            >
              {isLoading ? <Square size={10} fill="currentColor" /> : <Send size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas pane */}
      <div className="flex-1 bg-[#0d0d0d]">
        {currentArtifact ? (
          <ArtifactPreview artifact={currentArtifact} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-2xl">
              🎨
            </div>
            <div>
              <p className="text-[#666] text-sm">Your artifact will appear here</p>
              <p className="text-[#444] text-xs mt-1">
                Ask Spork to create an HTML page, document, or code snippet
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
