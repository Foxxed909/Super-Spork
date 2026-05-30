"use client";

import { useRef, useEffect, useState } from "react";
import { Square, Mic, Paperclip, Globe, Bold, Italic, Code } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommand {
  cmd: string;
  description: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { cmd: "/clear", description: "Clear the input" },
  { cmd: "/summarize", description: "Ask for a conversation summary" },
  { cmd: "/explain", description: "Ask Spork to explain in simpler terms" },
  { cmd: "/shorter", description: "Ask for a shorter response" },
  { cmd: "/bullet", description: "Ask for a bullet-point response" },
  { cmd: "/code", description: "Ask for a code example" },
];

const SLASH_REPLACEMENTS: Record<string, string> = {
  "/summarize": "Summarize our conversation in 3 concise bullet points.",
  "/explain": "Explain that in simpler terms, as if I'm new to this topic.",
  "/shorter": "Give me a shorter, more concise version of your last response.",
  "/bullet": "Rewrite your response as a clean bullet-point list.",
  "/code": "Show me a code example for this.",
};

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  webSearch?: boolean;
  onWebSearchToggle?: () => void;
  canWebSearch?: boolean;
  draftKey?: string;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
  placeholder = "Ask anything",
  webSearch,
  onWebSearchToggle,
  canWebSearch,
  draftKey,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [slashMenuIdx, setSlashMenuIdx] = useState(0);

  const showSlashMenu =
    value.startsWith("/") &&
    value.length > 0 &&
    !value.includes(" ") &&
    SLASH_COMMANDS.some((c) => c.cmd.startsWith(value));

  const filteredCmds = SLASH_COMMANDS.filter((c) => c.cmd.startsWith(value));

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  // Load draft on mount
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(`draft:${draftKey}`);
    if (saved && !value) onChange(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Save draft on change
  useEffect(() => {
    if (!draftKey) return;
    if (value) {
      localStorage.setItem(`draft:${draftKey}`, value);
    } else {
      localStorage.removeItem(`draft:${draftKey}`);
    }
  }, [draftKey, value]);

  const applySlashCommand = (cmd: string) => {
    if (cmd === "/clear") {
      onChange("");
    } else if (SLASH_REPLACEMENTS[cmd]) {
      onChange(SLASH_REPLACEMENTS[cmd]);
    }
    textareaRef.current?.focus();
  };

  const onEnterSend = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSlashMenuIdx((i) => (i + 1) % filteredCmds.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSlashMenuIdx((i) => (i - 1 + filteredCmds.length) % filteredCmds.length); return; }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        applySlashCommand(filteredCmds[slashMenuIdx]?.cmd ?? "");
        return;
      }
      if (e.key === "Escape") { e.preventDefault(); onChange(""); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        // Execute replacement if exact command match
        if (SLASH_REPLACEMENTS[value.trim()]) {
          onChange(SLASH_REPLACEMENTS[value.trim()]);
          setTimeout(() => onSubmit(), 0);
        } else if (value.trim() === "/clear") {
          onChange("");
        } else {
          onSubmit();
        }
      }
    }
  };

  useEffect(() => {
    setSlashMenuIdx(0);
  }, [value]);

  const wrapSelection = (marker: string, block?: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    let wrapped: string;
    if (block) {
      wrapped = selected
        ? `\`\`\`\n${selected}\n\`\`\``
        : `\`\`\`\n\n\`\`\``;
    } else {
      wrapped = `${marker}${selected || "text"}${marker}`;
    }
    const next = value.slice(0, start) + wrapped + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = selected ? start + wrapped.length : start + marker.length;
      ta.setSelectionRange(cursor, cursor);
    });
  };

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="px-4 pb-5 pt-2 max-w-3xl mx-auto w-full">
      {/* Slash command menu */}
      {showSlashMenu && filteredCmds.length > 0 && (
        <div className="mb-2 bg-[#141414] border border-[#2a2a2a] rounded-xl overflow-hidden shadow-xl">
          {filteredCmds.map((c, i) => (
            <button
              key={c.cmd}
              onMouseDown={(e) => { e.preventDefault(); applySlashCommand(c.cmd); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                i === slashMenuIdx ? "bg-[#1e1e1e]" : "hover:bg-[#1a1a1a]"
              )}
            >
              <span className="text-[#a78bfa] text-xs font-mono font-semibold shrink-0">{c.cmd}</span>
              <span className="text-[11px] text-[#666]">{c.description}</span>
            </button>
          ))}
          <div className="px-3 py-1.5 border-t border-[#2a2a2a] flex gap-3 text-[10px] text-[#444]">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> apply</span>
            <span><kbd className="font-mono">Esc</kbd> cancel</span>
          </div>
        </div>
      )}
      <div
        className={cn(
          "flex items-end gap-2 bg-black/60 backdrop-blur-md border rounded-full px-3 py-2.5 transition-all",
          disabled
            ? "border-white/[0.06] opacity-50"
            : "border-white/[0.1] focus-within:border-white/20 focus-within:shadow-[0_0_0_3px_rgba(167,139,250,0.08)]"
        )}
      >
        {/* Attach */}
        <button
          type="button"
          disabled={disabled}
          className="p-1.5 rounded-full text-[#555] hover:text-[#aaa] transition-colors shrink-0 mb-0.5"
          title="Attach"
        >
          <Paperclip size={15} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onEnterSend}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-sm text-[#efefef] placeholder-[#484848] resize-none outline-none leading-relaxed min-h-[22px] py-0.5"
          style={{ maxHeight: "200px" }}
        />

        {/* Web search toggle */}
        <button
          type="button"
          disabled={disabled || !canWebSearch}
          onClick={canWebSearch ? onWebSearchToggle : undefined}
          title={canWebSearch ? (webSearch ? "Web search on" : "Web search off") : "Super Spork required"}
          className={cn(
            "p-1.5 rounded-full transition-colors shrink-0 mb-0.5",
            webSearch
              ? "text-[#a78bfa] bg-[#a78bfa]/10"
              : canWebSearch
              ? "text-[#555] hover:text-[#aaa]"
              : "text-[#333] opacity-40 cursor-not-allowed"
          )}
        >
          <Globe size={15} />
        </button>

        {/* Mic */}
        <button
          type="button"
          disabled={disabled}
          className="p-1.5 rounded-full text-[#555] hover:text-[#aaa] transition-colors shrink-0 mb-0.5"
          title="Voice"
        >
          <Mic size={15} />
        </button>

        {/* Send / Stop */}
        <button
          onClick={isLoading ? onStop : onSubmit}
          disabled={!isLoading && !canSend}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all",
            isLoading
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : canSend
              ? "bg-[#efefef] text-[#0d0d0d] hover:bg-white scale-100"
              : "bg-[#1e1e1e] text-[#444] cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Square size={11} fill="currentColor" />
          ) : (
            /* Waveform bars */
            <span className="flex gap-[2px] items-center h-[14px]">
              <span className="w-[3px] h-[4px] bg-current rounded-full" />
              <span className="w-[3px] h-[9px] bg-current rounded-full" />
              <span className="w-[3px] h-[13px] bg-current rounded-full" />
              <span className="w-[3px] h-[9px] bg-current rounded-full" />
              <span className="w-[3px] h-[4px] bg-current rounded-full" />
            </span>
          )}
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); wrapSelection("**"); }}
            title="Bold (wrap selection)"
            className="p-1 rounded text-[#444] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors"
          >
            <Bold size={12} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); wrapSelection("_"); }}
            title="Italic (wrap selection)"
            className="p-1 rounded text-[#444] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors"
          >
            <Italic size={12} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); wrapSelection("`"); }}
            title="Inline code (wrap selection)"
            className="p-1 rounded text-[#444] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors"
          >
            <Code size={12} />
          </button>
          <span className="text-[11px] text-[#383838] ml-1">Spork can make mistakes.</span>
        </div>
        {value.length > 0 && (
          <span className={cn("text-[10px] tabular-nums", value.length > 3000 ? "text-red-400" : "text-[#383838]")}>
            {value.length.toLocaleString()} chars · ~{Math.ceil(value.length / 4).toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}
