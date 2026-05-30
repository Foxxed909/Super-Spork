"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  MessageSquare,
  Plus,
  Code2,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Trash2,
  Bot,
  Rss,
  Search,
  Paintbrush,
  Mic,
  Store,
  Pin,
  Swords,
  FolderOpen,
  FolderPlus,
  FolderInput,
  X,
  MessageSquarePlus,
  Scissors,
  CheckSquare,
  Square,
  BarChart2,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { hasClerkPublishableKey } from "@/lib/clerk-public";

interface Conversation {
  id: string;
  title: string;
  model: string;
  updatedAt: string;
  folderId?: string | null;
  pinned?: boolean;
  pinnedAt?: string | null;
}

interface FolderConv {
  id: string;
  title: string;
}

interface Folder {
  id: string;
  name: string;
  emoji: string | null;
  conversations: FolderConv[];
}

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface UserData {
  tier: string;
  dailyMessages: number;
  dailyLimit: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState(false);
  const clerkEnabled = hasClerkPublishableKey();

  // Folders state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState("");

  // Conversation rename state
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingConvTitle, setEditingConvTitle] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Move-to-folder menu
  const [folderMenuConvId, setFolderMenuConvId] = useState<string | null>(null);

  // Bulk select / delete
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchSidebarData = () => {
    setLoadError(false);
    Promise.all([
      fetch("/api/conversations").then((r) => r.json()),
      fetch("/api/user").then((r) => r.json()),
      fetch("/api/folders").then((r) => r.json()),
    ])
      .then(([data, user, folderData]) => {
        const convs = Array.isArray(data) ? data : (data.conversations ?? []);
        setConversations(convs);
        setNextCursor(data.nextCursor ?? null);
        setUserData(user);
        if (Array.isArray(folderData)) setFolders(folderData);
      })
      .catch(() => setLoadError(true));
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await fetch(`/api/conversations?cursor=${nextCursor}`).then((r) => r.json());
      const more = Array.isArray(data) ? data : (data.conversations ?? []);
      setConversations((prev) => [...prev, ...more]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      // silently fail; user can retry
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchSidebarData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Focus rename input when it appears
  useEffect(() => {
    if (editingConvId) setTimeout(() => renameInputRef.current?.focus(), 30);
  }, [editingConvId]);

  const startChat = async () => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-oss-120b:free" }),
    });
    if (!res.ok) { setLoadError(true); return; }
    const conv = await res.json();
    router.push(`/chat/${conv.id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    // Also remove from any folder
    setFolders((prev) =>
      prev.map((f) => ({ ...f, conversations: f.conversations.filter((c) => c.id !== id) }))
    );
    if (pathname === `/chat/${id}`) router.push("/");
  };

  const handlePin = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    const newPinned = !conv.pinned;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, pinned: newPinned, pinnedAt: newPinned ? new Date().toISOString() : null } : c
      )
    );
    try {
      await fetch(`/api/conversations/${id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: newPinned }),
      });
    } catch {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, pinned: conv.pinned, pinnedAt: conv.pinnedAt } : c
        )
      );
    }
  };

  // --- Rename conversation ---
  const startRename = (e: React.MouseEvent | React.KeyboardEvent, conv: Conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingConvTitle(conv.title);
    setFolderMenuConvId(null);
  };

  const commitRename = async (id: string, title: string) => {
    const trimmed = title.trim();
    setEditingConvId(null);
    if (!trimmed) return;
    setConversations((prev) => prev.map((c) => c.id === id ? { ...c, title: trimmed } : c));
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        conversations: f.conversations.map((c) => c.id === id ? { ...c, title: trimmed } : c),
      }))
    );
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: trimmed }),
    });
  };

  // --- Folder operations ---
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) { setCreatingFolder(false); return; }
    setCreatingFolder(false);
    setNewFolderName("");
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const folder = await res.json();
      setFolders((prev) => [...prev, { ...folder, conversations: [] }]);
    }
  };

  const renameFolder = async (id: string, name: string) => {
    const trimmed = name.trim();
    setRenamingFolderId(null);
    if (!trimmed) return;
    setFolders((prev) => prev.map((f) => f.id === id ? { ...f, name: trimmed } : f));
    await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
  };

  const deleteFolder = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Optimistically orphan conversations back to root
    const folder = folders.find((f) => f.id === id);
    if (folder) {
      const orphanedIds = new Set(folder.conversations.map((c) => c.id));
      setConversations((prev) =>
        prev.map((c) => orphanedIds.has(c.id) ? { ...c, folderId: null } : c)
      );
    }
    setFolders((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/folders/${id}`, { method: "DELETE" });
  };

  const moveToFolder = async (convId: string, folderId: string | null) => {
    setFolderMenuConvId(null);
    const conv = conversations.find((c) => c.id === convId);
    if (!conv) return;

    // Update conversations state
    setConversations((prev) =>
      prev.map((c) => c.id === convId ? { ...c, folderId } : c)
    );
    // Update folders state
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        conversations: f.id === folderId
          ? [...f.conversations.filter((c) => c.id !== convId), { id: conv.id, title: conv.title }]
          : f.conversations.filter((c) => c.id !== convId),
      }))
    );

    if (folderId) {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId }),
      });
    } else {
      await fetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: null }),
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    setConversations((prev) => prev.filter((c) => !selectedIds.has(c.id)));
    setFolders((prev) =>
      prev.map((f) => ({ ...f, conversations: f.conversations.filter((c) => !selectedIds.has(c.id)) }))
    );
    setSelectedIds(new Set());
    setSelectMode(false);
    await Promise.all(ids.map((id) => fetch(`/api/conversations/${id}`, { method: "DELETE" })));
    if (ids.includes(pathname.split("/chat/")[1] ?? "")) router.push("/");
  };

  const isSuperSpork = (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) >= 3;

  // Only show conversations without a folder in the main list (unless searching)
  const rootConvs = conversations.filter((c) => !c.folderId);

  const filtered = rootConvs.filter((c) =>
    search.trim() ? c.title.toLowerCase().includes(search.toLowerCase()) : true
  );

  // When searching, also include folder conversations that match
  const folderMatchConvs: Conversation[] = search.trim()
    ? conversations.filter(
        (c) =>
          c.folderId &&
          c.title.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  const pinned = filtered
    .filter((c) => c.pinned || !!c.pinnedAt)
    .sort((a, b) => {
      const aAt = a.pinnedAt ?? "";
      const bAt = b.pinnedAt ?? "";
      if (aAt && bAt) return new Date(bAt).getTime() - new Date(aAt).getTime();
      return 0;
    });

  const unpinned = filtered
    .filter((c) => !c.pinned && !c.pinnedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const renderConvLink = (conv: Conversation) => {
    const isActive = pathname === `/chat/${conv.id}`;
    const isEditing = editingConvId === conv.id;

    const isSelected = selectedIds.has(conv.id);
    return (
      <div key={conv.id} className="relative group">
        {selectMode ? (
          <button
            onClick={() => setSelectedIds((prev) => { const next = new Set(prev); if (next.has(conv.id)) next.delete(conv.id); else next.add(conv.id); return next; })}
            className={cn("w-full flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors", isSelected ? "bg-[#a78bfa]/10 text-white" : "text-[#aaa] hover:bg-[#1a1a1a]")}
          >
            {isSelected ? <CheckSquare size={13} className="text-[#a78bfa] shrink-0" /> : <Square size={13} className="text-[#555] shrink-0" />}
            <span className="truncate text-sm">{conv.title}</span>
          </button>
        ) : isEditing ? (
          <div className="flex items-center gap-1 px-3 py-1.5">
            <input
              ref={renameInputRef}
              value={editingConvTitle}
              onChange={(e) => setEditingConvTitle(e.target.value)}
              onBlur={() => commitRename(conv.id, editingConvTitle)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(conv.id, editingConvTitle);
                if (e.key === "Escape") setEditingConvId(null);
              }}
              className="flex-1 bg-[#1e1e1e] border border-[#a78bfa]/50 rounded-full px-2 py-1 text-xs text-white outline-none"
            />
          </div>
        ) : (
          <Link
            href={`/chat/${conv.id}`}
            onDoubleClick={(e) => startRename(e, conv)}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-full text-sm transition-colors",
              isActive ? "bg-[#1e1e1e] text-white" : "text-[#aaa] hover:bg-[#1a1a1a] hover:text-white"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {conv.pinned && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />}
              {!conv.pinned && <MessageSquare size={14} className="shrink-0 text-[#555]" />}
              <div className="min-w-0">
                <p className="truncate font-medium leading-tight">{conv.title}</p>
                <p className="text-xs text-[#555] mt-0.5">{formatDate(conv.updatedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFolderMenuConvId(folderMenuConvId === conv.id ? null : conv.id); }}
                className="p-1 rounded-full text-[#555] hover:text-[#a78bfa] transition-all"
                title="Move to folder"
              >
                <FolderInput size={11} />
              </button>
              <button
                onClick={(e) => handlePin(e, conv.id)}
                className={cn("p-1 rounded-full text-[#555] hover:text-purple-400 transition-all", conv.pinned && "text-purple-400")}
                title={conv.pinned ? "Unpin" : "Pin"}
              >
                <Pin size={11} />
              </button>
              <button
                onClick={(e) => handleDelete(e, conv.id)}
                className="p-1 rounded-full text-[#555] hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </Link>
        )}

        {/* Move-to-folder dropdown */}
        {folderMenuConvId === conv.id && (
          <div className="absolute right-0 top-full mt-0.5 w-44 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-xl z-50 overflow-hidden">
            {folders.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[#555]">No folders yet</p>
            ) : (
              folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => moveToFolder(conv.id, f.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#aaa] hover:bg-[#232323] hover:text-white transition-colors text-left"
                >
                  <span>{f.emoji ?? "📁"}</span>
                  <span className="truncate">{f.name}</span>
                </button>
              ))
            )}
            {conv.folderId && (
              <button
                onClick={() => moveToFolder(conv.id, null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-[#232323] transition-colors text-left border-t border-[#2a2a2a]"
              >
                <X size={11} />
                Remove from folder
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFolderConvLink = (fconv: FolderConv, folder: Folder) => {
    const isActive = pathname === `/chat/${fconv.id}`;
    const isEditing = editingConvId === fconv.id;

    return (
      <div key={fconv.id} className="relative group">
        {isEditing ? (
          <div className="flex items-center gap-1 px-3 py-1.5 pl-6">
            <input
              ref={renameInputRef}
              value={editingConvTitle}
              onChange={(e) => setEditingConvTitle(e.target.value)}
              onBlur={() => commitRename(fconv.id, editingConvTitle)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename(fconv.id, editingConvTitle);
                if (e.key === "Escape") setEditingConvId(null);
              }}
              className="flex-1 bg-[#1e1e1e] border border-[#a78bfa]/50 rounded-full px-2 py-1 text-xs text-white outline-none"
            />
          </div>
        ) : (
          <Link
            href={`/chat/${fconv.id}`}
            onDoubleClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingConvId(fconv.id); setEditingConvTitle(fconv.title); }}
            className={cn(
              "flex items-center justify-between pl-6 pr-3 py-1.5 rounded-full text-sm transition-colors",
              isActive ? "bg-[#1e1e1e] text-white" : "text-[#888] hover:bg-[#1a1a1a] hover:text-white"
            )}
          >
            <span className="truncate text-xs">{fconv.title}</span>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveToFolder(fconv.id, null); }}
                className="p-1 rounded-full text-[#555] hover:text-[#a78bfa] transition-all"
                title="Remove from folder"
              >
                <X size={10} />
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  await fetch(`/api/conversations/${fconv.id}`, { method: "DELETE" });
                  setFolders((prev) =>
                    prev.map((f) =>
                      f.id === folder.id ? { ...f, conversations: f.conversations.filter((c) => c.id !== fconv.id) } : f
                    )
                  );
                  if (pathname === `/chat/${fconv.id}`) router.push("/");
                }}
                className="p-1 rounded-full text-[#555] hover:text-red-400 transition-all"
              >
                <Trash2 size={10} />
              </button>
            </div>
          </Link>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-[#111] border-r border-[#1e1e1e] transition-all duration-200 shrink-0",
        collapsed ? "w-14" : "w-60"
      )}
      onClick={() => { if (folderMenuConvId) setFolderMenuConvId(null); }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3.5 border-b border-[#1e1e1e]">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[17px] font-black tracking-tight text-white">
              {isSuperSpork ? (
                <><span className="text-[#a78bfa]">SUPER</span> SPORK</>
              ) : (
                "SPORK"
              )}
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-full text-[#555] hover:text-white hover:bg-[#1c1c1c] transition-colors ml-auto"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* New Chat */}
      <div className="p-2 pt-2.5">
        <button
          onClick={startChat}
          className={cn(
            "flex items-center gap-2 w-full rounded-full px-3 py-2 text-sm font-medium",
            "bg-[#1c1c1c] text-[#888] border border-[#272727]",
            "hover:bg-[#232323] hover:text-white transition-colors",
            collapsed && "justify-center px-2"
          )}
        >
          <Plus size={15} />
          {!collapsed && "New chat"}
        </button>
      </div>

      {/* Conversations */}
      {!collapsed && (
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Search */}
          {(conversations.length > 0 || folders.length > 0) && (
            <div className="px-2 pt-1 pb-0.5 space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1a1a] border border-[#272727] rounded-full flex-1">
                  <Search size={12} className="text-[#555] shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-transparent text-xs text-[#ccc] placeholder-[#555] outline-none"
                  />
                </div>
                <button
                  onClick={() => { setSelectMode((s) => !s); setSelectedIds(new Set()); }}
                  title="Select conversations"
                  className={cn("p-1.5 rounded-full transition-colors", selectMode ? "text-[#a78bfa] bg-[#a78bfa]/10" : "text-[#555] hover:text-white hover:bg-[#1a1a1a]")}
                >
                  <CheckSquare size={13} />
                </button>
              </div>
              {selectMode && (
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] text-[#555] flex-1">{selectedIds.size} selected</span>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="text-[10px] px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full hover:bg-red-500/20 transition-colors"
                    >
                      Delete {selectedIds.size}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (selectedIds.size === conversations.length) setSelectedIds(new Set());
                      else setSelectedIds(new Set(conversations.map((c) => c.id)));
                    }}
                    className="text-[10px] px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded-full hover:text-white transition-colors"
                  >
                    {selectedIds.size === conversations.length ? "Deselect all" : "Select all"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {loadError ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-[#555] mb-2">Couldn&apos;t load</p>
                <button
                  onClick={fetchSidebarData}
                  className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Folder sections */}
                {folders.map((folder) => {
                  const isCollapsed = collapsedFolderIds.has(folder.id);
                  const isRenamingThis = renamingFolderId === folder.id;
                  const folderConvs = search.trim()
                    ? folder.conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
                    : folder.conversations;

                  return (
                    <div key={folder.id} className="mb-0.5">
                      <div className="flex items-center gap-1 px-1 py-1 group/folder rounded-full hover:bg-[#1a1a1a] transition-colors">
                        <button
                          onClick={() =>
                            setCollapsedFolderIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(folder.id)) next.delete(folder.id);
                              else next.add(folder.id);
                              return next;
                            })
                          }
                          className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
                        >
                          <ChevronDown
                            size={12}
                            className={cn("text-[#555] shrink-0 transition-transform", isCollapsed && "-rotate-90")}
                          />
                          <FolderOpen size={13} className="text-[#a78bfa] shrink-0" />
                          {isRenamingThis ? (
                            <input
                              autoFocus
                              value={renamingFolderName}
                              onChange={(e) => setRenamingFolderName(e.target.value)}
                              onBlur={() => renameFolder(folder.id, renamingFolderName)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") renameFolder(folder.id, renamingFolderName);
                                if (e.key === "Escape") setRenamingFolderId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 bg-transparent text-xs text-white outline-none min-w-0"
                            />
                          ) : (
                            <span className="text-xs text-[#aaa] truncate font-medium">
                              {folder.emoji && <span className="mr-1">{folder.emoji}</span>}
                              {folder.name}
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-all shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setRenamingFolderId(folder.id); setRenamingFolderName(folder.name); }}
                            className="p-0.5 text-[#555] hover:text-white transition-colors"
                            title="Rename folder"
                          >
                            <FolderInput size={11} />
                          </button>
                          <button
                            onClick={(e) => deleteFolder(e, folder.id)}
                            className="p-0.5 text-[#555] hover:text-red-400 transition-colors"
                            title="Delete folder"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      {!isCollapsed && (
                        <div className="space-y-0.5 ml-1">
                          {folderConvs.map((fc) => renderFolderConvLink(fc, folder))}
                          {folderConvs.length === 0 && (
                            <p className="pl-7 text-[10px] text-[#444] py-1">Empty</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* New folder button */}
                {!search.trim() && (
                  <div className="px-1">
                    {creatingFolder ? (
                      <div className="flex items-center gap-1.5 px-2 py-1">
                        <FolderOpen size={13} className="text-[#a78bfa] shrink-0" />
                        <input
                          autoFocus
                          value={newFolderName}
                          onChange={(e) => setNewFolderName(e.target.value)}
                          onBlur={createFolder}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") createFolder();
                            if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                          }}
                          placeholder="Folder name"
                          className="flex-1 bg-transparent text-xs text-white placeholder-[#444] outline-none"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => setCreatingFolder(true)}
                        className="flex items-center gap-1.5 px-2 py-1 text-[#444] hover:text-[#888] transition-colors text-xs w-full"
                      >
                        <FolderPlus size={13} />
                        New folder
                      </button>
                    )}
                  </div>
                )}

                {/* Pinned convs (root only) */}
                {pinned.length > 0 && (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Pinned</span>
                    </div>
                    {pinned.map(renderConvLink)}
                    {unpinned.length > 0 && (
                      <div className="px-3 pt-2 pb-1 border-t border-[#272727] mt-1">
                        <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider">Conversations</span>
                      </div>
                    )}
                  </>
                )}
                {unpinned.map(renderConvLink)}

                {/* Folder search results */}
                {folderMatchConvs.length > 0 && (
                  <>
                    <div className="px-3 pt-2 pb-1">
                      <span className="text-[10px] font-semibold text-[#a78bfa]/70 uppercase tracking-wider">In folders</span>
                    </div>
                    {folderMatchConvs.map((c) => renderConvLink(c))}
                  </>
                )}

                {conversations.length === 0 && folders.length === 0 && (
                  <p className="px-3 py-4 text-xs text-[#555] text-center">No conversations yet</p>
                )}

                {nextCursor && !search.trim() && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full text-xs text-[#555] hover:text-[#a78bfa] py-2 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : "Load more"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="p-2 border-t border-[#272727] space-y-0.5">
        <Link
          href="/feed"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/feed" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Rss size={16} />
          {!collapsed && "Feed"}
        </Link>

        <Link
          href="/agents"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/agents" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Bot size={16} />
          {!collapsed && "Agents"}
        </Link>

        <Link
          href="/canvas"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/canvas" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Paintbrush size={16} />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              Canvas
              {!isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full font-medium">SUPER</span>
              )}
            </span>
          )}
        </Link>

        <Link
          href="/voice"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/voice" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Mic size={16} />
          {!collapsed && "Voice"}
        </Link>

        <Link
          href="/hub"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname.startsWith("/hub") ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Store size={16} />
          {!collapsed && "Hub"}
        </Link>

        <Link
          href="/arena"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname.startsWith("/arena") ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Swords size={16} />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              Arena
              {!isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full font-medium">SUPER</span>
              )}
            </span>
          )}
        </Link>

        <Link
          href="/code"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/code" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Code2 size={16} />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              Spork Code
              {!isSuperSpork && (
                <span className="text-[10px] bg-[#a78bfa]/20 text-[#a78bfa] px-1.5 py-0.5 rounded-full font-medium">SUPER</span>
              )}
            </span>
          )}
        </Link>

        <Link
          href="/snippets"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/snippets" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Scissors size={16} />
          {!collapsed && "Snippets"}
        </Link>

        <Link
          href="/feedback"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/feedback" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <MessageSquarePlus size={16} />
          {!collapsed && "Feedback"}
        </Link>

        <Link
          href="/stats"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/stats" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <BarChart2 size={16} />
          {!collapsed && "Stats"}
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-full text-sm transition-colors",
            pathname === "/settings" ? "bg-[#1c1c1c] text-white" : "text-[#666] hover:text-white hover:bg-[#1a1a1a]",
            collapsed && "justify-center px-2"
          )}
        >
          <Settings size={16} />
          {!collapsed && "Settings"}
        </Link>

        {/* Tier badge */}
        {!collapsed && userData && (
          <div className="px-3 py-2 mt-1">
            {(TIER_RANK[userData.tier] ?? 0) >= 3 ? (
              <div className="flex items-center gap-1.5 text-xs text-[#a78bfa]">
                <Sparkles size={12} />
                <span className="font-semibold capitalize">{userData.tier.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
              </div>
            ) : (TIER_RANK[userData.tier] ?? 0) >= 1 ? (
              <div className="flex items-center gap-1.5 text-xs text-[#3b82f6]">
                <Sparkles size={12} />
                <span className="font-semibold capitalize">{userData.tier.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#666]">
                  <span>{userData.dailyMessages}/{userData.dailyLimit} messages</span>
                  <span>today</span>
                </div>
                <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#a78bfa] rounded-full transition-all"
                    style={{ width: `${Math.min((userData.dailyMessages / userData.dailyLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* User */}
        <div className={cn("flex items-center gap-2 px-3 py-2", collapsed && "justify-center px-2")}>
          {clerkEnabled ? (
            <UserButton
              appearance={{
                variables: { colorPrimary: "#a78bfa" },
                elements: { avatarBox: "w-7 h-7" },
              }}
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1e1e1e] text-xs font-semibold text-[#888]">
              D
            </div>
          )}
          {!collapsed && (
            <span className="text-xs text-[#666]">{clerkEnabled ? "Account" : "Demo"}</span>
          )}
        </div>
      </div>
    </aside>
  );
}
