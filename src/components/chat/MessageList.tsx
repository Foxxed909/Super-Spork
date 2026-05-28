"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Message } from "ai";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  sendError?: string | null;
  onRetry?: () => void;
}

export function MessageList({ messages, isLoading, sendError, onRetry }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

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

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-3xl mx-auto w-full">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && (
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-[#a78bfa]">S</span>
          </div>
          <div className="flex-1 pt-1">
            <div className="streaming-cursor text-[#888] text-sm" />
          </div>
        </div>
      )}
      {sendError && !isLoading && (
        <div className="flex items-center gap-3 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
          isUser
            ? "bg-[#2a2a2a] text-[#888]"
            : "bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-[#a78bfa]"
        )}
      >
        {isUser ? "U" : "S"}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex-1 min-w-0",
          isUser && "flex justify-end"
        )}
      >
        {isUser ? (
          <div className="inline-block max-w-[85%] bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-[#e0e0e0]">
            {message.content as string}
          </div>
        ) : (
          <div className="group relative">
            <div className="prose text-sm leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ children, ...props }) => (
                    <CodeBlock {...props}>{children}</CodeBlock>
                  ),
                }}
              >
                {message.content as string}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);

  const handleCopy = () => {
    const text = ref.current?.textContent ?? "";
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group/code my-3">
      <pre ref={ref} {...props} className="!mt-0 !mb-0">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-[#2a2a2a] text-[#888] hover:text-white opacity-0 group-hover/code:opacity-100 transition-all"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}
