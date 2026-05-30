// Live-artifact helpers — shared by chat message detection and the docked
// ArtifactPanel. Pure and dependency-free: heavy renderers (Mermaid, React,
// Babel) are loaded from a CDN *inside* the iframe srcDoc, so they never enter
// the Next/Turbopack bundle and add zero compile cost on the constrained box.

export type ArtifactKind = "html" | "svg" | "mermaid" | "react";

export interface Artifact {
  kind: ArtifactKind;
  lang: string;
  code: string;
}

// Fenced-code language (```lang) -> renderable kind. Covers common aliases.
export const RENDERABLE_LANGS: Record<string, ArtifactKind> = {
  html: "html",
  svg: "svg",
  mermaid: "mermaid",
  jsx: "react",
  tsx: "react",
  react: "react",
};

export function kindForLang(lang?: string | null): ArtifactKind | null {
  if (!lang) return null;
  return RENDERABLE_LANGS[lang.trim().toLowerCase()] ?? null;
}

const KIND_LABELS: Record<ArtifactKind, string> = {
  html: "Live Preview",
  svg: "SVG",
  mermaid: "Diagram",
  react: "React Component",
};

export function labelForKind(kind: ArtifactKind): string {
  return KIND_LABELS[kind];
}

const KIND_EXTENSIONS: Record<ArtifactKind, string> = {
  html: "html",
  svg: "svg",
  mermaid: "mmd",
  react: "jsx",
};

export function extensionForKind(kind: ArtifactKind): string {
  return KIND_EXTENSIONS[kind];
}

// Minimal HTML escape for embedding untrusted text into element bodies.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PAGE_RESET = `
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
  </style>
`;

function htmlSrcDoc(code: string): string {
  // If the model already produced a full document, render it verbatim.
  if (/<html[\s>]/i.test(code) || /<!doctype/i.test(code)) {
    return code;
  }
  // Otherwise wrap the fragment in a neutral light page.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${PAGE_RESET}
  <style>body { padding: 16px; background: #ffffff; color: #111; }</style>
</head>
<body>
${code}
</body>
</html>`;
}

function svgSrcDoc(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${PAGE_RESET}
  <style>
    body {
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; background: #ffffff; padding: 16px;
    }
    svg { max-width: 100%; max-height: 100vh; height: auto; }
  </style>
</head>
<body>
${code}
</body>
</html>`;
}

function mermaidSrcDoc(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${PAGE_RESET}
  <style>
    body { background: #0d0d0d; color: #eee; padding: 16px; }
    .mermaid { display: flex; justify-content: center; }
    #err { color: #ff6b6b; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 13px; }
  </style>
</head>
<body>
  <pre class="mermaid">${escapeHtml(code)}</pre>
  <div id="err"></div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
  <script>
    try {
      mermaid.initialize({ startOnLoad: true, theme: "dark", securityLevel: "strict" });
    } catch (e) {
      document.getElementById("err").textContent = "Mermaid error: " + (e && e.message ? e.message : e);
    }
    window.addEventListener("error", function (ev) {
      document.getElementById("err").textContent = "Mermaid error: " + ev.message;
    });
  </script>
</body>
</html>`;
}

function reactSrcDoc(code: string): string {
  // React + ReactDOM + Babel standalone from CDN. The user's code is compiled
  // in-browser via <script type="text/babel">. We mount whatever component is
  // available: an explicit `App`, a default export pattern, or fall back to the
  // last-defined capitalized identifier. Render errors surface in #err.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${PAGE_RESET}
  <style>
    body { background: #ffffff; color: #111; padding: 16px; }
    #err { color: #c92a2a; white-space: pre-wrap; font-family: ui-monospace, monospace; font-size: 13px; }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body>
  <div id="root"></div>
  <div id="err"></div>
  <script type="text/babel" data-presets="react">
    const { useState, useEffect, useRef, useReducer, useMemo, useCallback, Fragment } = React;

    function __reportError(e) {
      const el = document.getElementById("err");
      if (el) el.textContent = "Render error: " + (e && e.stack ? e.stack : (e && e.message ? e.message : e));
    }

    class __ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { error: null }; }
      static getDerivedStateFromError(error) { return { error }; }
      componentDidCatch(error) { __reportError(error); }
      render() {
        if (this.state.error) return null;
        return this.props.children;
      }
    }

    window.addEventListener("error", function (ev) { __reportError(ev.error || ev.message); });
    window.addEventListener("unhandledrejection", function (ev) { __reportError(ev.reason); });

    try {
${code}

      // Resolve the component to mount.
      let __Component =
        (typeof App !== "undefined" && App) ||
        (typeof Component !== "undefined" && Component) ||
        (typeof Main !== "undefined" && Main) ||
        null;

      if (!__Component) {
        throw new Error("No component found. Define a component named App (or Component / Main).");
      }

      const __root = ReactDOM.createRoot(document.getElementById("root"));
      __root.render(
        <__ErrorBoundary>
          <__Component />
        </__ErrorBoundary>
      );
    } catch (e) {
      __reportError(e);
    }
  </script>
</body>
</html>`;
}

// Scan a markdown string for fenced code blocks whose language maps to a
// renderable kind. Returns them in document order (used to auto-open the latest).
const FENCE_RE = /```([A-Za-z0-9_+-]+)[^\n]*\n([\s\S]*?)```/g;

export function findRenderableArtifacts(markdown: string): Artifact[] {
  const out: Artifact[] = [];
  let m: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(markdown)) !== null) {
    const lang = m[1];
    const kind = kindForLang(lang);
    if (kind) {
      out.push({ kind, lang: lang.toLowerCase(), code: m[2].replace(/\n$/, "") });
    }
  }
  return out;
}

export function buildSrcDoc(a: Artifact): string {
  switch (a.kind) {
    case "html":
      return htmlSrcDoc(a.code);
    case "svg":
      return svgSrcDoc(a.code);
    case "mermaid":
      return mermaidSrcDoc(a.code);
    case "react":
      return reactSrcDoc(a.code);
    default:
      return htmlSrcDoc(a.code);
  }
}
