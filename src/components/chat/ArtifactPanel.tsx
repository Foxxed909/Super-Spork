"use client";

import { useMemo, useState } from "react";
import {
  Globe,
  Image as ImageIcon,
  GitBranch,
  Code2,
  RefreshCw,
  ExternalLink,
  Download,
  Copy,
  Check,
  X,
} from "lucide-react";

import {
  type Artifact,
  type ArtifactKind,
  buildSrcDoc,
  extensionForKind,
  labelForKind,
} from "@/lib/artifacts";

const KIND_ICON: Record<ArtifactKind, typeof Globe> = {
  html: Globe,
  svg: ImageIcon,
  mermaid: GitBranch,
  react: Code2,
};

interface ArtifactPanelProps {
  artifact: Artifact;
  onClose: () => void;
}

export function ArtifactPanel({ artifact, onClose }: ArtifactPanelProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [iframeKey, setIframeKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const srcDoc = useMemo(() => buildSrcDoc(artifact), [artifact]);
  const Icon = KIND_ICON[artifact.kind];

  const handleRefresh = () => setIframeKey((k) => k + 1);

  const handleOpenNewTab = () => {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    // Revoke after a tick so the new tab has loaded.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const handleDownload = () => {
    const blob = new Blob([artifact.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact.${extensionForKind(artifact.kind)}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(artifact.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border-l border-[#1e1e1e]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#2a2a2a] bg-[#111]">
        <div className="flex items-center gap-2 text-xs text-[#888] min-w-0">
          <Icon size={13} className="shrink-0" />
          <span className="truncate">{labelForKind(artifact.kind)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {tab === "preview" && (
            <button
              onClick={handleRefresh}
              title="Refresh"
              className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          )}
          <button
            onClick={handleOpenNewTab}
            title="Open in new tab"
            className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
          >
            <ExternalLink size={12} />
          </button>
          <button
            onClick={handleDownload}
            title="Download"
            className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
          >
            <Download size={12} />
          </button>
          <button
            onClick={handleCopy}
            title="Copy source"
            className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="p-1.5 rounded text-[#555] hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#1e1e1e] bg-[#0d0d0d]">
        <button
          onClick={() => setTab("preview")}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            tab === "preview"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#666] hover:text-[#999]"
          }`}
        >
          Preview
        </button>
        <button
          onClick={() => setTab("code")}
          className={`px-2.5 py-1 text-xs rounded transition-colors ${
            tab === "code"
              ? "bg-[#1e1e1e] text-white"
              : "text-[#666] hover:text-[#999]"
          }`}
        >
          Code
        </button>
      </div>

      {/* Body */}
      {tab === "preview" ? (
        <iframe
          key={iframeKey}
          srcDoc={srcDoc}
          title="Artifact preview"
          sandbox="allow-scripts"
          className="flex-1 w-full bg-white"
        />
      ) : (
        <div className="flex-1 overflow-auto bg-[#0d0d0d]">
          <pre className="text-xs text-[#ccc] p-4 font-mono whitespace-pre-wrap break-words">
            <code>{artifact.code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
