"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AGENTS } from "@/lib/agents";
import { AgentCard } from "@/components/agents/AgentCard";
import { Sparkles } from "lucide-react";

const TIER_RANK: Record<string, number> = {
  FREE: 0, SPORK_LITE: 1, SPORK_PRO: 2, SUPER_SPORK: 3,
  SPORK_ULTRA: 4, SPORK_INFINITY: 5, SPORK_GODMODE: 6,
};

interface UserData {
  tier: string;
}

export default function AgentsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/user")
      .then((r) => r.json())
      .then(setUserData)
      .catch(() => {});
  }, []);

  const handleSelectAgent = async (agentId: string) => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b:free",
        agentId,
      }),
    });
    const conv = await res.json();
    router.push(`/chat/${conv.id}`);
  };

  const freeAgents = AGENTS.filter((a) => a.tier === "free");
  const paidAgents = AGENTS.filter((a) => a.tier === "paid");
  const isSuperSpork = (TIER_RANK[userData?.tier ?? "FREE"] ?? 0) >= 3;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight text-white">
          Spork Agents
        </h1>
        <p className="text-sm text-[#666] mt-1">
          Choose a persona and Spork becomes someone entirely different.
        </p>
      </div>

      {/* Free agents */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-4">
          Free Agents — Available to everyone
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {freeAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              userTier={userData?.tier ?? "FREE"}
              onSelect={handleSelectAgent}
            />
          ))}
        </div>
      </div>

      {/* Paid agents */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xs font-semibold text-[#a78bfa] uppercase tracking-wider">
            Super Spork Agents
          </h2>
          {!isSuperSpork && (
            <a
              href="/settings"
              className="flex items-center gap-1 text-[10px] bg-[#a78bfa]/10 text-[#a78bfa] px-2 py-0.5 rounded-full hover:bg-[#a78bfa]/20 transition-colors"
            >
              <Sparkles size={9} />
              Upgrade to unlock
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paidAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              userTier={userData?.tier ?? "FREE"}
              onSelect={handleSelectAgent}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
