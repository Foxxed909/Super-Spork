"use client";

import { useEffect, useState } from "react";
import { CodeChat } from "@/components/code/CodeChat";
import { CodeEditor } from "@/components/code/CodeEditor";
import { Sparkles, MessageSquare, Code2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

type EditorView = "chat" | "editor" | "inline";

interface UserData {
  tier: string;
}

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

export default function CodePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [mode, setMode] = useState<EditorView>("chat");
  const [editorCode, setEditorCode] = useState("// Paste or write your code here\n");

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
  }, []);

  if (!userData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  if ((TIER_RANK[userData.tier] ?? 0) < 3) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
          <Code2 size={28} className="text-[#a78bfa]" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Spork Code</h2>
          <p className="text-[#666] text-sm max-w-xs">
            Your AI coding assistant with a full editor, chat, and inline mode.
            Available with Super Spork.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-[#888] text-center">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#a78bfa]" /> Unlimited coding sessions
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#a78bfa]" /> Monaco code editor
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#a78bfa]" /> Claude, GPT-4o & more
          </div>
        </div>
        <Link
          href="/settings"
          className="px-6 py-2.5 bg-[#a78bfa] hover:bg-[#9061f9] text-white rounded-2xl text-sm font-semibold transition-colors"
        >
          Upgrade to Super Spork
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mode tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#1e1e1e]">
        <ModeTabs mode={mode} onChange={setMode} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "chat" && (
          <CodeChat userTier={userData.tier} />
        )}

        {mode === "editor" && (
          <div className="flex h-full">
            <div className="flex-1 border-r border-[#2a2a2a]">
              <CodeEditor value={editorCode} onChange={setEditorCode} />
            </div>
            <div className="w-[420px]">
              <CodeChat userTier={userData.tier} contextCode={editorCode} />
            </div>
          </div>
        )}

        {mode === "inline" && (
          <div className="flex flex-col h-full">
            <div className="h-1/2 border-b border-[#2a2a2a]">
              <CodeEditor value={editorCode} onChange={setEditorCode} />
            </div>
            <div className="h-1/2">
              <CodeChat userTier={userData.tier} contextCode={editorCode} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeTabs({
  mode,
  onChange,
}: {
  mode: EditorView;
  onChange: (m: EditorView) => void;
}) {
  const tabs: { id: EditorView; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat", icon: <MessageSquare size={14} /> },
    { id: "editor", label: "Editor", icon: <Code2 size={14} /> },
    { id: "inline", label: "Inline", icon: <Layers size={14} /> },
  ];

  return (
    <div className="flex gap-1 bg-[#1a1a1a] p-1 rounded-full border border-[#2a2a2a]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors",
            mode === tab.id
              ? "bg-[#2a2a2a] text-white font-medium"
              : "text-[#666] hover:text-[#aaa]"
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
