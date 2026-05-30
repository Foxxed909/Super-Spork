"use client";

import { useState } from "react";
import { MessageSquarePlus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type FeedbackType = "BUG" | "FEATURE_REQUEST" | "PRAISE" | "QUESTION" | "OTHER";

const TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: "BUG", label: "Bug Report", emoji: "🐛" },
  { value: "FEATURE_REQUEST", label: "Feature Request", emoji: "✨" },
  { value: "PRAISE", label: "Praise", emoji: "🙌" },
  { value: "QUESTION", label: "Question", emoji: "❓" },
  { value: "OTHER", label: "Other", emoji: "💬" },
];

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>("BUG");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, subject, body, email: email || undefined }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const text = await res.text();
        setError(text || "Failed to submit feedback.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <Check size={24} className="text-emerald-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">Thanks for your feedback!</h2>
          <p className="text-[#666] text-sm">We read every submission and use it to improve Spork.</p>
        </div>
        <button
          onClick={() => { setSubmitted(false); setSubject(""); setBody(""); setEmail(""); }}
          className="text-sm text-[#a78bfa] hover:text-[#c4b5fd] transition-colors"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquarePlus size={20} className="text-[#a78bfa]" />
        <div>
          <h1 className="text-2xl font-black text-white">Feedback</h1>
          <p className="text-sm text-[#666] mt-0.5">Tell us what&apos;s working and what isn&apos;t</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type selector */}
        <div>
          <label className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2 block">
            Type
          </label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all",
                  type === t.value
                    ? "bg-[#a78bfa]/10 border-[#a78bfa]/50 text-[#a78bfa] font-medium"
                    : "bg-[#111] border-[#2a2a2a] text-[#666] hover:border-[#3a3a3a] hover:text-[#aaa]"
                )}
              >
                <span>{t.emoji}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2 block">
            Subject
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your feedback"
            maxLength={200}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-2xl px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a] transition-colors"
          />
          <div className="text-right text-[10px] text-[#444] mt-1">{subject.length}/200</div>
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2 block">
            Description
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Give us all the details — steps to reproduce, expected vs actual behavior, ideas..."
            maxLength={5000}
            rows={6}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-2xl px-4 py-3 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a] transition-colors resize-none"
          />
          <div className="text-right text-[10px] text-[#444] mt-1">{body.length}/5000</div>
        </div>

        {/* Email (optional) */}
        <div>
          <label className="text-xs font-semibold text-[#666] uppercase tracking-wider mb-2 block">
            Email <span className="text-[#444] font-normal normal-case">(optional — for follow-up)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-2xl px-4 py-2.5 text-sm text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#3a3a3a] transition-colors"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[#a78bfa] hover:bg-[#9061f9] text-white font-semibold rounded-2xl transition-colors disabled:opacity-50 text-sm"
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
      </form>
    </div>
  );
}
