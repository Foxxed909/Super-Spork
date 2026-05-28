"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, MessageSquare, Plus, Settings, Store, Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
}

interface PaletteItem {
  id: string;
  label: string;
  group: "conversations" | "actions";
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true;
  const lText = text.toLowerCase();
  const lQuery = query.toLowerCase();
  let qi = 0;
  for (let i = 0; i < lText.length && qi < lQuery.length; i++) {
    if (lText[i] === lQuery[qi]) qi++;
  }
  return qi === lQuery.length;
}

export function CommandPalette({ open, onClose, onNewChat }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data: Conversation[]) => setConversations(data.slice(0, 10)))
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const actions: PaletteItem[] = [
    {
      id: "new-chat",
      label: "New Chat",
      group: "actions",
      icon: <Plus size={15} className="text-[#a78bfa]" />,
      action: () => { onClose(); onNewChat(); },
    },
    {
      id: "settings",
      label: "Settings",
      group: "actions",
      icon: <Settings size={15} className="text-[#666]" />,
      action: () => { onClose(); router.push("/settings"); },
    },
    {
      id: "hub",
      label: "Hub",
      group: "actions",
      icon: <Store size={15} className="text-[#666]" />,
      action: () => { onClose(); router.push("/hub"); },
    },
    {
      id: "export",
      label: "Export conversation",
      group: "actions",
      icon: <Download size={15} className="text-[#666]" />,
      action: () => {
        onClose();
        window.dispatchEvent(new CustomEvent("spork:export"));
      },
    },
  ];

  const convItems: PaletteItem[] = conversations
    .filter((c) => fuzzyMatch(c.title, query))
    .map((c) => ({
      id: c.id,
      label: c.title,
      group: "conversations" as const,
      icon: <MessageSquare size={14} className="text-[#555]" />,
      action: () => { onClose(); router.push(`/chat/${c.id}`); },
    }));

  const filteredActions = actions.filter((a) => fuzzyMatch(a.label, query));

  const allItems: PaletteItem[] = [...convItems, ...filteredActions];

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(allItems.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + Math.max(allItems.length, 1)) % Math.max(allItems.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        allItems[activeIndex]?.action();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [allItems, activeIndex, onClose]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const hasConvs = convItems.length > 0;
  const hasActions = filteredActions.length > 0;
  const convOffset = 0;
  const actionOffset = convItems.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl bg-[#141414] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a2a]">
          <Search size={16} className="text-[#555] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations, actions..."
            className="flex-1 bg-transparent text-sm text-white placeholder-[#555] outline-none"
          />
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {allItems.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[#555] text-center">No results for &quot;{query}&quot;</p>
          ) : (
            <>
              {hasConvs && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">Conversations</span>
                  </div>
                  {convItems.map((item, idx) => (
                    <PaletteRow
                      key={item.id}
                      item={item}
                      isActive={activeIndex === convOffset + idx}
                      onMouseEnter={() => setActiveIndex(convOffset + idx)}
                    />
                  ))}
                </>
              )}
              {hasActions && (
                <>
                  <div className={cn("px-4 pb-1", hasConvs ? "pt-3 border-t border-[#2a2a2a] mt-1" : "pt-3")}>
                    <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">Actions</span>
                  </div>
                  {filteredActions.map((item, idx) => (
                    <PaletteRow
                      key={item.id}
                      item={item}
                      isActive={activeIndex === actionOffset + idx}
                      onMouseEnter={() => setActiveIndex(actionOffset + idx)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-[#2a2a2a] flex items-center gap-4 text-[10px] text-[#444]">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span><kbd className="font-mono">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

function PaletteRow({
  item,
  isActive,
  onMouseEnter,
}: {
  item: PaletteItem;
  isActive: boolean;
  onMouseEnter: () => void;
}) {
  return (
    <button
      onClick={item.action}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-sm",
        isActive ? "bg-[#1e1e1e] text-white" : "text-[#aaa] hover:bg-[#1a1a1a]"
      )}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </button>
  );
}
