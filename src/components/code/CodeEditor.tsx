"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { Copy, Check, Trash2, Wand2, Bug } from "lucide-react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-[#0d0d0d]">
      <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
    </div>
  ),
});

const LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "java",
  "cpp",
  "csharp",
  "css",
  "html",
  "json",
  "yaml",
  "markdown",
  "sql",
  "bash",
];

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional: render a "Find & Fix bugs" button that calls this. */
  onRunFif?: () => void;
}

export function CodeEditor({ value, onChange, onRunFif }: CodeEditorProps) {
  const [language, setLanguage] = useState("typescript");
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const lineCount = value ? value.split("\n").length : 0;
  const charCount = value.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleFormat = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleClear = () => {
    if (value.trim() && !confirm("Clear the editor?")) return;
    onChange("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a2a] bg-[#0d0d0d]">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#aaa] rounded px-2 py-1 outline-none focus:border-[#a78bfa]/40"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-0.5 ml-1">
          <button
            onClick={handleFormat}
            title="Format document"
            className="p-1.5 rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <Wand2 size={13} />
          </button>
          <button
            onClick={handleCopy}
            title="Copy all"
            className="p-1.5 rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleClear}
            title="Clear editor"
            className="p-1.5 rounded text-[#666] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {onRunFif && (
          <button
            onClick={onRunFif}
            title="Find, Identify + Fix bugs in this code"
            className="ml-1 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25 hover:bg-[#a78bfa]/25 transition-colors"
          >
            <Bug size={12} />
            Find &amp; Fix
          </button>
        )}

        <span className="ml-auto text-[10px] text-[#444] tabular-nums">
          {lineCount} ln · {charCount} ch
        </span>
      </div>

      <div className="flex-1">
        <MonacoEditor
          height="100%"
          language={language}
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={(ed) => {
            editorRef.current = ed;
          }}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            tabSize: 2,
            wordWrap: "on",
            renderLineHighlight: "none",
            smoothScrolling: true,
          }}
        />
      </div>
    </div>
  );
}
