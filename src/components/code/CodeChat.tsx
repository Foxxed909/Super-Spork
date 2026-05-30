"use client";

import { useChat } from "ai/react";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useEffect, useRef, useState } from "react";
import { Trash2, FileCode2 } from "lucide-react";

// Qwen3 Coder 480B — a free, code-specialized model — is the natural default
// for Spork Code. Falls back fine for any tier since it's a free model.
const DEFAULT_CODE_MODEL = "qwen/qwen3-coder:free";

interface CodeChatProps {
  userTier: string;
  contextCode?: string;
  /** Increment this to trigger a "Find, Identify + Fix bugs" run on contextCode. */
  fifSignal?: number;
}

export function CodeChat({ userTier, contextCode, fifSignal }: CodeChatProps) {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_CODE_MODEL);

  // System prompt is injected server-side via sporkCode flag + codeContext.
  const { messages, input, setInput, append, isLoading, stop, setMessages } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel,
      sporkCode: true,
      codeContext: contextCode ?? null,
    },
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    append({ role: "user", content: input });
    setInput("");
  };

  // FIF: Find, Identify + Fix. Triggered from the editor toolbar via a signal.
  const lastFifRef = useRef(fifSignal ?? 0);
  useEffect(() => {
    if (fifSignal === undefined || fifSignal === lastFifRef.current) return;
    lastFifRef.current = fifSignal;
    if (isLoading) return;
    const code = (contextCode ?? "").trim();
    if (!code) return;
    append({
      role: "user",
      content:
        "FIF — Find, Identify + Fix every bug in this code. List each bug with its cause, then return the corrected code:\n\n```\n" +
        code +
        "\n```",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fifSignal]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1e1e1e] bg-[#0d0d0d]">
        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
          userTier={userTier}
        />
        <span className="flex items-center gap-1.5 text-xs text-[#555]">
          <FileCode2 size={12} />
          {contextCode ? "Editor context attached" : "No editor context"}
        </span>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            title="Clear conversation"
            className="ml-auto flex items-center gap-1 text-xs text-[#555] hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={handleSend}
        onStop={stop}
        isLoading={isLoading}
        placeholder="Ask about your code, paste a snippet, or describe what to build…"
      />
    </div>
  );
}
