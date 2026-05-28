"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CommandPalette } from "./CommandPalette";

export function CommandPaletteWrapper() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleNewChat = useCallback(async () => {
    setOpen(false);
    const res = await fetch("/api/conversations", { method: "POST" });
    if (res.ok) {
      const conv = await res.json();
      router.push(`/chat/${conv.id}`);
    }
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (meta && e.key === "n") { e.preventDefault(); handleNewChat(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleNewChat]);

  return (
    <CommandPalette open={open} onClose={() => setOpen(false)} onNewChat={handleNewChat} />
  );
}
