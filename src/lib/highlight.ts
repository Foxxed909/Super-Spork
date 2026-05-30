// Curated highlight.js language set.
//
// rehype-highlight defaults to lowlight's "common" bundle (~37 grammars), which
// is a meaningful chunk of the chat route's module graph and client bundle. On a
// memory-constrained dev box this inflates Turbopack compile time. We register
// only the languages we realistically render, passed to rehypeHighlight({ languages }).
import type { LanguageFn } from "lowlight";

import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

export const highlightLanguages: Record<string, LanguageFn> = {
  bash,
  c,
  cpp,
  csharp,
  css,
  go,
  java,
  javascript,
  json,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
};

// Aliases so fenced blocks like ```js / ```ts / ```sh / ```html resolve.
export const highlightAliases: Record<string, string[]> = {
  javascript: ["js", "jsx"],
  typescript: ["ts", "tsx"],
  bash: ["sh", "shell", "zsh"],
  xml: ["html", "svg"],
  python: ["py"],
  markdown: ["md"],
};
