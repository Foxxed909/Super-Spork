"use client";

import { useEffect, useState } from "react";
import { Code2, Plus, Trash2, Copy, Check, Save, X, Search, Download } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

interface Snippet {
  id: string;
  title: string;
  content: string;
  lang: string | null;
  createdAt: string;
}

const LANGS = ["", "javascript", "typescript", "python", "bash", "sql", "html", "css", "json", "yaml", "rust", "go", "java"];

export default function SnippetsPage() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newLang, setNewLang] = useState("");
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/snippets")
      .then((r) => r.json())
      .then((data) => { setSnippets(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, content: newContent, lang: newLang || null }),
      });
      if (res.ok) {
        const snippet = await res.json();
        setSnippets((prev) => [snippet, ...prev]);
        setCreating(false);
        setNewTitle("");
        setNewContent("");
        setNewLang("");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/snippets/${id}`, { method: "DELETE" });
  };

  const handleCopy = (snippet: Snippet) => {
    navigator.clipboard.writeText(snippet.content);
    setCopiedId(snippet.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportAll = () => {
    const lines = snippets.map((s) => `# ${s.title}${s.lang ? ` (${s.lang})` : ""}\n\n${s.content}`).join("\n\n---\n\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "snippets.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = search.trim()
    ? snippets.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || (s.lang ?? "").toLowerCase().includes(search.toLowerCase()) || s.content.toLowerCase().includes(search.toLowerCase()))
    : snippets;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Code2 size={20} className="text-[#a78bfa]" />
          <div>
            <h1 className="text-2xl font-black text-white">Snippets</h1>
            <p className="text-sm text-[#666] mt-0.5">Your saved code and text snippets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {snippets.length > 0 && (
            <button
              onClick={handleExportAll}
              title="Export all snippets"
              className="p-2 text-[#555] hover:text-white transition-colors rounded-full hover:bg-[#1a1a1a]"
            >
              <Download size={15} />
            </button>
          )}
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] hover:bg-[#9061f9] text-white text-sm font-semibold rounded-2xl transition-colors"
          >
            <Plus size={14} />
            New Snippet
          </button>
        </div>
      </div>

      {/* Search */}
      {snippets.length > 2 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#2a2a2a] rounded-xl mb-4">
          <Search size={13} className="text-[#555] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search snippets…"
            className="flex-1 bg-transparent text-sm text-[#ccc] placeholder-[#444] outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[#444] hover:text-white transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="bg-[#111] border border-[#a78bfa]/30 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Snippet title"
              className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-white placeholder-[#444] outline-none focus:border-[#3a3a3a]"
            />
            <select
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#aaa] outline-none focus:border-[#3a3a3a]"
            >
              <option value="">Language</option>
              {LANGS.filter(Boolean).map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Paste your snippet here..."
            rows={8}
            className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a] font-mono resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !newTitle.trim() || !newContent.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#a78bfa] hover:bg-[#9061f9] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              <Save size={13} />
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => { setCreating(false); setNewTitle(""); setNewContent(""); setNewLang(""); }}
              className="p-2 text-[#555] hover:text-white transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 && !creating && snippets.length > 0 ? (
        <div className="text-center py-10">
          <p className="text-[#555] text-sm">No snippets match &ldquo;{search}&rdquo;</p>
        </div>
      ) : snippets.length === 0 && !creating ? (
        <div className="text-center py-16">
          <Code2 size={32} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#555] text-sm">No snippets yet.</p>
          <p className="text-[#444] text-xs mt-1">Save code blocks or text you reuse often.</p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 text-sm text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
          >
            Create your first snippet
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="bg-[#111] border border-[#2a2a2a] rounded-2xl overflow-hidden group">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{s.title}</h3>
                  {s.lang && (
                    <span className="text-[10px] bg-[#1e1e1e] border border-[#2a2a2a] text-[#888] px-1.5 py-0.5 rounded shrink-0">
                      {s.lang}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-[#444] mr-1">{formatDate(s.createdAt)}</span>
                  <button
                    onClick={() => handleCopy(s)}
                    title="Copy to clipboard"
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      copiedId === s.id ? "text-green-400" : "text-[#555] hover:text-white"
                    )}
                  >
                    {copiedId === s.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    title="Delete"
                    className="p-1.5 rounded-full text-[#555] hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <pre className="px-4 py-3 text-xs text-[#aaa] font-mono overflow-x-auto leading-relaxed max-h-40 whitespace-pre-wrap break-all">
                {s.content.slice(0, 500)}{s.content.length > 500 ? "\n…" : ""}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
