"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoicePipProps {
  onTranscript?: (text: string) => void;
}

export function VoicePip({ onTranscript }: VoicePipProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (SpeechRecognition) setSupported(true);
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      if (transcript) {
        onTranscript?.(transcript);
        // Dispatch global event so any chat input can listen
        window.dispatchEvent(new CustomEvent("spork:voice-input", { detail: transcript }));
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <button
      onClick={toggle}
      title={listening ? "Stop recording" : "Start voice input (Spork Voice)"}
      className={`fixed bottom-24 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
        listening
          ? "bg-red-500 animate-pulse shadow-red-500/40"
          : "bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] shadow-[#7c3aed]/30 hover:opacity-90"
      }`}
    >
      {listening ? <MicOff size={18} className="text-white" /> : <Mic size={18} className="text-white" />}
    </button>
  );
}
