"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { group: "Navigation", items: [
    { keys: ["?"], description: "Open keyboard shortcuts" },
    { keys: ["Ctrl", "K"], description: "New conversation" },
    { keys: ["Ctrl", ","], description: "Go to Settings" },
  ]},
  { group: "Chat", items: [
    { keys: ["Enter"], description: "Send message" },
    { keys: ["Shift", "Enter"], description: "New line in message" },
    { keys: ["Ctrl", "/"], description: "Focus message input" },
    { keys: ["Ctrl", "Shift", "R"], description: "Regenerate title with AI" },
    { keys: ["Ctrl", "Shift", "S"], description: "Toggle stats panel" },
    { keys: ["Ctrl", "Shift", "W"], description: "Toggle web search" },
    { keys: ["Ctrl", "Shift", "E"], description: "Export conversation as Markdown" },
    { keys: ["F"], description: "Enter / exit focus (zen) mode" },
  ]},
  { group: "Input slash commands", items: [
    { keys: ["/clear"], description: "Clear the input" },
    { keys: ["/summarize"], description: "Summarize the conversation" },
    { keys: ["/explain"], description: "Ask for a simpler explanation" },
    { keys: ["/shorter"], description: "Request a shorter response" },
    { keys: ["/bullet"], description: "Format response as bullets" },
    { keys: ["/code"], description: "Request a code example" },
  ]},
  { group: "Sidebar", items: [
    { keys: ["Ctrl", "B"], description: "Collapse / expand sidebar" },
  ]},
];

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e1e1e] sticky top-0 bg-[#111]">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-[#a78bfa]" />
            <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#555] hover:text-white transition-colors rounded-full hover:bg-[#1e1e1e]">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 space-y-5">
          {SHORTCUTS.map((group) => (
            <div key={group.group}>
              <p className="text-[10px] font-semibold text-[#555] uppercase tracking-wider mb-2">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <div key={item.description} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[#1a1a1a] transition-colors">
                    <span className="text-sm text-[#888]">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, i) => (
                        <span key={i} className="text-[10px] font-mono bg-[#1e1e1e] border border-[#2a2a2a] text-[#aaa] px-1.5 py-0.5 rounded">{k}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
