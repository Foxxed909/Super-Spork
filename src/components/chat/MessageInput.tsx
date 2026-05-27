"use client";

import { useRef, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  disabled,
  placeholder = "Message Spork...",
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [value]);

  const onEnterSend = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) onSubmit();
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 max-w-3xl mx-auto w-full">
      <div
        className={cn(
          "flex items-end gap-2 bg-[#1a1a1a] border rounded-2xl px-4 py-3 transition-colors",
          disabled
            ? "border-[#2a2a2a] opacity-60"
            : "border-[#2a2a2a] focus-within:border-[#3a3a3a]"
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onEnterSend}
          disabled={disabled || isLoading}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent text-sm text-[#f0f0f0] placeholder-[#555] resize-none outline-none leading-relaxed min-h-[24px]"
          style={{ maxHeight: "200px" }}
        />
        <button
          onClick={isLoading ? onStop : onSubmit}
          disabled={!isLoading && (!value.trim() || disabled)}
          className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all",
            isLoading
              ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
              : value.trim() && !disabled
              ? "bg-[#a78bfa] text-white hover:bg-[#9061f9]"
              : "bg-[#2a2a2a] text-[#555] cursor-not-allowed"
          )}
        >
          {isLoading ? <Square size={12} fill="currentColor" /> : <ArrowUp size={14} />}
        </button>
      </div>
      <p className="text-center text-xs text-[#444] mt-2">
        Spork can make mistakes. Consider checking important information.
      </p>
    </div>
  );
}
