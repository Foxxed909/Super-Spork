"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

interface Badge {
  type: string;
  awardedAt: string;
}

interface Post {
  id: string;
  content: string;
  type: string;
  likes: number;
  tags: string[];
  createdAt: string;
  conversationId: string | null;
}

interface TopConversation {
  id: string;
  title: string;
  likes: number;
  views: number;
  createdAt: string;
  agentId: string | null;
}

interface ProfileData {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  link: string | null;
  isVerified: boolean;
  tier: string;
  createdAt: string;
  isFollowing: boolean;
  isMe: boolean;
  _count: {
    followers: number;
    following: number;
    conversations: number;
    posts: number;
  };
  badges: Badge[];
  conversations: TopConversation[];
  posts: Post[];
}

const BADGE_LABELS: Record<string, { label: string; emoji: string }> = {
  EARLY_ADOPTER: { label: "Early Adopter", emoji: "🌱" },
  POWER_USER: { label: "Power User", emoji: "⚡" },
  TOP_AGENT: { label: "Top Agent Creator", emoji: "🏆" },
  STREAK_7: { label: "7-Day Streak", emoji: "🔥" },
  STREAK_30: { label: "30-Day Streak", emoji: "🌟" },
  FIRST_FORK: { label: "First Fork", emoji: "🍴" },
  VIRAL_CONV: { label: "Viral Conversation", emoji: "📈" },
  CONTRIBUTOR: { label: "Contributor", emoji: "🤝" },
};

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  FREE: { label: "Free", color: "text-zinc-400" },
  SPORK_LITE: { label: "Lite", color: "text-blue-400" },
  SPORK_PRO: { label: "Pro", color: "text-indigo-400" },
  SUPER_SPORK: { label: "Super Spork", color: "text-purple-400" },
  SPORK_ULTRA: { label: "Ultra", color: "text-yellow-400" },
  SPORK_INFINITY: { label: "Infinity", color: "text-pink-400" },
  SPORK_GODMODE: { label: "Godmode", color: "text-red-400" },
};

const POST_TYPE_COLORS: Record<string, string> = {
  TEXT: "bg-zinc-700 text-zinc-300",
  CODE: "bg-green-900/40 text-green-300",
  QUESTION: "bg-blue-900/40 text-blue-300",
  SHOWCASE: "bg-purple-900/40 text-purple-300",
};

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "conversations">("posts");

  useEffect(() => {
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Profile not found");
        return r.json();
      })
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [username]);

  async function toggleFollow() {
    if (!profile || profile.isMe) return;
    setFollowLoading(true);
    try {
      const method = profile.isFollowing ? "DELETE" : "POST";
      const res = await fetch(`/api/profile/${encodeURIComponent(username)}/follow`, { method });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProfile((p) =>
        p
          ? {
              ...p,
              isFollowing: data.following,
              _count: {
                ...p._count,
                followers: p._count.followers + (data.following ? 1 : -1),
              },
            }
          : p
      );
    } catch {
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-zinc-400">
        <p className="text-lg">@{username} not found</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-purple-400 hover:text-purple-300"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const tierInfo = TIER_LABELS[profile.tier] ?? { label: profile.tier, color: "text-zinc-400" };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center text-2xl">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.displayName ?? profile.username} className="w-full h-full object-cover" />
          ) : (
            <span>{(profile.displayName ?? profile.username)[0]?.toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-white truncate">
              {profile.displayName ?? profile.username}
            </h1>
            {profile.isVerified && (
              <span className="text-blue-400 text-sm" title="Verified">✓</span>
            )}
            <span className={`text-xs font-medium ${tierInfo.color}`}>{tierInfo.label}</span>
          </div>
          <p className="text-zinc-400 text-sm">@{profile.username}</p>
          {profile.bio && (
            <p className="text-zinc-300 text-sm mt-2 whitespace-pre-wrap">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-500">
            {profile.location && <span>📍 {profile.location}</span>}
            {profile.link && (
              <a
                href={profile.link.startsWith("http") ? profile.link : `https://${profile.link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline truncate max-w-[180px]"
              >
                🔗 {profile.link}
              </a>
            )}
            <span>Joined {timeAgo(profile.createdAt)}</span>
          </div>
        </div>

        {!profile.isMe && (
          <button
            onClick={toggleFollow}
            disabled={followLoading}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              profile.isFollowing
                ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                : "bg-purple-600 text-white hover:bg-purple-500"
            } disabled:opacity-50`}
          >
            {followLoading ? "..." : profile.isFollowing ? "Following" : "Follow"}
          </button>
        )}
        {profile.isMe && (
          <button
            onClick={() => router.push("/settings")}
            className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
          >
            Edit profile
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div className="text-center">
          <p className="font-semibold text-white">{profile._count.followers}</p>
          <p className="text-zinc-500">followers</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">{profile._count.following}</p>
          <p className="text-zinc-500">following</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">{profile._count.conversations}</p>
          <p className="text-zinc-500">conversations</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-white">{profile._count.posts}</p>
          <p className="text-zinc-500">posts</p>
        </div>
      </div>

      {/* Badges */}
      {profile.badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profile.badges.map((badge) => {
            const info = BADGE_LABELS[badge.type] ?? { label: badge.type, emoji: "🏅" };
            return (
              <span
                key={badge.type}
                title={`Awarded ${timeAgo(badge.awardedAt)}`}
                className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 flex items-center gap-1"
              >
                {info.emoji} {info.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-zinc-800">
        {(["posts", "conversations"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "text-white border-b-2 border-purple-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts tab */}
      {activeTab === "posts" && (
        <div className="space-y-3">
          {profile.posts.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No posts yet.</p>
          )}
          {profile.posts.map((post) => (
            <div
              key={post.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POST_TYPE_COLORS[post.type] ?? "bg-zinc-700 text-zinc-300"}`}>
                  {post.type.toLowerCase()}
                </span>
                <span className="text-xs text-zinc-600 ml-auto">
                  {timeAgo(post.createdAt)}
                </span>
              </div>
              <p className="text-zinc-200 text-sm whitespace-pre-wrap break-words">{post.content}</p>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs text-purple-400">#{tag}</span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-zinc-600">
                <span>♥ {post.likes}</span>
                {post.conversationId && (
                  <button
                    onClick={() => router.push(`/chat/${post.conversationId}`)}
                    className="text-purple-500 hover:text-purple-400"
                  >
                    View conversation →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conversations tab */}
      {activeTab === "conversations" && (
        <div className="space-y-3">
          {profile.conversations.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-8">No public conversations yet.</p>
          )}
          {profile.conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => router.push(`/share/${conv.id}`)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left hover:border-zinc-700 transition-colors"
            >
              <p className="text-white text-sm font-medium truncate">{conv.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-600">
                <span>♥ {conv.likes}</span>
                <span>👁 {conv.views}</span>
                {conv.agentId && <span className="text-purple-500">@{conv.agentId}</span>}
                <span className="ml-auto">
                  {timeAgo(conv.createdAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
