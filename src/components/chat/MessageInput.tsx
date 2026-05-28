"use client";

import { useRef, useEffect } from "react";
import { Square, Mic, Paperclip } from "lucide-react";
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
  placeholder = "Ask anything",
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

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="px-4 pb-5 pt-2 max-w-3xl mx-auto w-full">
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
      <p className="text-center text-[11px] text-[#383838] mt-2.5">
        Spork can make mistakes. Consider verifying important information.
      </p>
    </div>
  );
}
