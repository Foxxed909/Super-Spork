"use client";

import { useChat } from "ai/react";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { useState } from "react";
import { DEFAULT_PAID_MODEL } from "@/lib/models";

interface CodeChatProps {
  userTier: string;
  contextCode?: string;
  isFif?: boolean;
}

export function CodeChat({ userTier, contextCode, isFif }: CodeChatProps) {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_PAID_MODEL);

  // System prompt is injected server-side via sporkCode flag + codeContext
  // We do NOT put messages in body — that would conflict with useChat's own messages array
  const { messages, input, setInput, append, isLoading, stop } = useChat({
    api: "/api/chat",
    body: {
      model: selectedModel,
      sporkCode: true,
      codeContext: contextCode ?? null,
    },
  });

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const content = isFif
      ? `FIF — Find, Identify + Fix all bugs in this code:\n\`\`\`\n${contextCode}\n\`\`\``
      : input;
    append({ role: "user", content });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e]">
        <ModelSelector
          value={selectedModel}
          onChange={setSelectedModel}
          userTier={userTier}
        />
        <span className="text-xs text-[#555]">
          {contextCode ? "Code context loaded" : "No code context"}
        </span>
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
        placeholder={isFif ? "FIF will auto-run on your code..." : "Ask about your code..."}
      />
    </div>
  );
}
