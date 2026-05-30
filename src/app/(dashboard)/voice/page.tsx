"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useChat } from "ai/react";
import { DEFAULT_FREE_MODEL } from "@/lib/models";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

interface UserData {
  tier: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionAny = any;

export default function VoicePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [convId, setConvId] = useState<string | null>(null);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [muted, setMuted] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionAny>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const hasRecognition =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSupported(hasRecognition);
  }, []);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!convId) {
      fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: DEFAULT_FREE_MODEL }),
      })
        .then((r) => r.json())
        .then((c) => setConvId(c.id))
        .catch(() => {});
    }
  }, [convId]);

  const { append, isLoading } = useChat({
    api: "/api/chat",
    body: { model: DEFAULT_FREE_MODEL, conversationId: convId },
    onFinish: (message) => {
      setLastResponse(message.content);
      setVoiceState("speaking");
      if (!muted) {
        speak(message.content);
      } else {
        setVoiceState("idle");
      }
    },
  });

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") return;
      window.speechSynthesis.cancel();

      const plainText = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .trim()
        .slice(0, 600);

      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.05;
      utterance.pitch = 1;
      utterance.onend = () => setVoiceState("idle");
      utterance.onerror = () => setVoiceState("idle");
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [muted]
  );

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setVoiceState("idle");
  };

  const startListening = useCallback(() => {
    if (!supported || isLoading) return;
    stopSpeaking();

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setVoiceState("listening");
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      const result = Array.from(event.results as any[])
        .map((r: any) => r[0].transcript)
        .join("");
      setTranscript(result);
    };

    recognition.onend = () => {
      setTranscript((t) => {
        const final = t.trim();
        if (final) {
          setVoiceState("thinking");
          append({ role: "user", content: final });
        } else {
          setVoiceState("idle");
        }
        return final;
      });
    };

    recognition.onerror = () => setVoiceState("idle");

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported, isLoading, append]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  if (!userData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#a78bfa]/30 border-t-[#a78bfa] rounded-full animate-spin" />
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <MicOff size={32} className="text-[#555]" />
        <p className="text-[#666] text-sm">
          Voice mode requires a browser that supports the Web Speech API.
          <br />
          Try Chrome or Edge.
        </p>
      </div>
    );
  }

  const stateLabel: Record<VoiceState, string> = {
    idle: "Tap to speak",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  const stateColor: Record<VoiceState, string> = {
    idle: "bg-[#1a1a1a] border-[#3a3a3a] text-white hover:border-[#a78bfa]/50",
    listening: "bg-red-500/10 border-red-500/50 text-red-400",
    thinking: "bg-[#a78bfa]/10 border-[#a78bfa]/50 text-[#a78bfa]",
    speaking: "bg-green-500/10 border-green-500/40 text-green-400",
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-10 px-4">
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-black text-white mb-1">🎙 Spork Voice</h1>
        <p className="text-sm text-[#555]">Talk to Spork, hands-free</p>
      </div>

      {/* Mic button */}
      <div className="relative flex items-center justify-center">
        {voiceState === "listening" && (
          <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping scale-150" />
        )}
        {voiceState === "speaking" && (
          <div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-pulse scale-150" />
        )}
        <button
          onMouseDown={voiceState === "idle" ? startListening : undefined}
          onMouseUp={voiceState === "listening" ? stopListening : undefined}
          onTouchStart={voiceState === "idle" ? startListening : undefined}
          onTouchEnd={voiceState === "listening" ? stopListening : undefined}
          onClick={voiceState === "speaking" ? stopSpeaking : undefined}
          className={cn(
            "w-28 h-28 rounded-full border-2 flex items-center justify-center transition-all duration-200",
            stateColor[voiceState]
          )}
        >
          {voiceState === "listening" ? (
            <Mic size={36} className="text-red-400" />
          ) : voiceState === "speaking" ? (
            <Volume2 size={36} className="text-green-400" />
          ) : (
            <Mic size={36} />
          )}
        </button>
      </div>

      {/* State label */}
      <p className="text-sm font-medium text-[#888]">{stateLabel[voiceState]}</p>

      {/* Transcript + response */}
      <div className="w-full max-w-lg space-y-3">
        {transcript && (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 text-sm text-[#ccc] text-right">
            <span className="text-[10px] text-[#555] block mb-1">You</span>
            {transcript}
          </div>
        )}
        {lastResponse && (
          <div className="bg-[#a78bfa]/5 border border-[#a78bfa]/20 rounded-2xl px-4 py-3 text-sm text-[#ddd]">
            <span className="text-[10px] text-[#a78bfa] block mb-1">Spork</span>
            {lastResponse.slice(0, 300)}
            {lastResponse.length > 300 && "…"}
          </div>
        )}
      </div>

      {/* Mute toggle */}
      <button
        onClick={() => {
          setMuted((m) => !m);
          if (voiceState === "speaking") stopSpeaking();
        }}
        className="flex items-center gap-2 text-xs text-[#555] hover:text-white transition-colors"
      >
        {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        {muted ? "Unmute responses" : "Mute responses"}
      </button>

      {voiceState === "idle" && (
        <p className="text-[10px] text-[#444] text-center">
          Hold the button while speaking, release when done
        </p>
      )}
    </div>
  );
}
