"use client";

import { useState, useEffect, useCallback } from "react";

interface CommentData {
  id: string;
  animeId: string;
  episode: number | null;
  username: string;
  content: string;
  parentId: string | null;
  rating: number | null;
  likes: number;
  createdAt: string;
  likesList: { sessionId: string }[];
}

interface CommentStats {
  total: number;
  avgRating: number;
  ratingCount: number;
}

interface CommentSectionProps {
  animeId: string;
}

function StarRating({ rating, onRate, size = "sm" }: { rating: number; onRate?: (r: number) => void; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onRate?.(star)}
          className={`${onRate ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          disabled={!onRate}
        >
          <svg className={`${sz} ${star <= rating ? "text-amber-400" : "text-zinc-600"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommentSection({ animeId }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [stats, setStats] = useState<CommentStats>({ total: 0, avgRating: 0, ratingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [username, setUsername] = useState("");
  const [userRating, setUserRating] = useState(0);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "top">("newest");
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      let sid = localStorage.getItem("luffy_session_id");
      if (!sid) {
        sid = "user_" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem("luffy_session_id", sid);
      }
      return sid;
    }
    return "anon";
  });

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?animeId=${encodeURIComponent(animeId)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setStats(data.stats || { total: 0, avgRating: 0, ratingCount: 0 });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [animeId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // Load saved username
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("luffy_username");
      if (saved) setUsername(saved);
    }
  }, []);

  const handleSubmit = async () => {
    if (!newComment.trim() || !username.trim()) return;
    localStorage.setItem("luffy_username", username.trim());

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          animeId,
          username: username.trim(),
          content: newComment.trim(),
          parentId: replyTo,
          rating: replyTo ? undefined : (userRating > 0 ? userRating : undefined),
        }),
      });
      if (res.ok) {
        setNewComment("");
        setUserRating(0);
        setReplyTo(null);
        fetchComments();
      }
    } catch { /* ignore */ }
  };

  const handleLike = async (commentId: string) => {
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", commentId, sessionId }),
      });
      fetchComments();
    } catch { /* ignore */ }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", commentId }),
      });
      fetchComments();
    } catch { /* ignore */ }
  };

  // Sort comments
  const sorted = [...comments].sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return b.likes - a.likes;
  });

  // Build tree
  const topLevel = sorted.filter(c => !c.parentId);
  const getReplies = (parentId: string) => sorted.filter(c => c.parentId === parentId);

  const renderComment = (comment: CommentData, depth = 0) => {
    const isLiked = comment.likesList?.some(l => l.sessionId === sessionId);
    const replies = getReplies(comment.id);

    return (
      <div key={comment.id} className={`${depth > 0 ? "ml-6 sm:ml-8 border-l-2 border-white/[0.04] pl-4" : ""}`}>
        <div className="flex gap-3 p-3 rounded-xl bg-[#131c26] border border-white/[0.03] hover:border-white/[0.06] transition-all">
          {/* Avatar */}
          <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-white/[0.06]">
            <span className="text-xs font-bold text-cyan-300">{comment.username.charAt(0).toUpperCase()}</span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-cyan-300">{comment.username}</span>
              <span className="text-[10px] text-zinc-600">{formatTimeAgo(comment.createdAt)}</span>
              {comment.rating != null && comment.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  <StarRating rating={comment.rating} />
                  <span className="text-[9px] text-amber-400 font-bold">{comment.rating}</span>
                </div>
              )}
            </div>

            {/* Content */}
            <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed break-words">{comment.content}</p>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => handleLike(comment.id)}
                className={`flex items-center gap-1 text-[10px] font-medium transition-colors ${isLiked ? "text-rose-400" : "text-zinc-500 hover:text-rose-400"}`}
              >
                <svg className="w-3.5 h-3.5" fill={isLiked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
                {comment.likes > 0 && comment.likes}
              </button>
              <button
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="text-[10px] font-medium text-zinc-500 hover:text-cyan-400 transition-colors"
              >
                Reply
              </button>
              {comment.username === username && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-[10px] font-medium text-zinc-600 hover:text-rose-400 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>

            {/* Reply form */}
            {replyTo === comment.id && (
              <div className="mt-3 space-y-2 p-3 bg-[#0b1116] rounded-lg border border-white/[0.04]">
                <input
                  type="text"
                  placeholder="Your name"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full h-8 px-3 text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-zinc-500 outline-none focus:border-cyan-500/30"
                />
                <textarea
                  placeholder={`Reply to ${comment.username}...`}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-zinc-500 outline-none focus:border-cyan-500/30 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={!newComment.trim() || !username.trim()}
                    className="px-3 py-1.5 text-[10px] font-bold bg-cyan-500/15 text-cyan-300 rounded-full border border-cyan-500/20 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Post Reply
                  </button>
                  <button
                    onClick={() => setReplyTo(null)}
                    className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nested replies */}
        {replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {replies.map(r => renderComment(r, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="section-header flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <h3 className="text-sm font-bold text-white">Comments</h3>
          <span className="text-[10px] text-zinc-500">({stats.total})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Rating summary */}
          {stats.ratingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/15">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-[11px] font-bold text-amber-300">{stats.avgRating}</span>
              <span className="text-[9px] text-amber-400/60">({stats.ratingCount})</span>
            </div>
          )}
          {/* Sort */}
          <div className="flex items-center gap-0.5 bg-[#1a2530] rounded-full p-0.5 border border-white/[0.06]">
            {(["newest", "top", "oldest"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all ${
                  sortBy === s ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Post comment form */}
      <div className="p-4 bg-[#131c26] rounded-xl border border-white/[0.04] space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Your name"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full sm:w-36 h-9 px-3 text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-zinc-500 outline-none focus:border-cyan-500/30 shrink-0"
          />
          <div className="flex-1 flex items-center gap-2">
            <textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              rows={1}
              className="flex-1 px-3 py-2 text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-zinc-500 outline-none focus:border-cyan-500/30 resize-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500">Rate:</span>
            <StarRating rating={userRating} onRate={setUserRating} size="md" />
            {userRating > 0 && (
              <button onClick={() => setUserRating(0)} className="text-[10px] text-zinc-600 hover:text-zinc-400">Clear</button>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || !username.trim()}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Post
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))}
        </div>
      ) : topLevel.length > 0 ? (
        <div className="space-y-2">
          {topLevel.map(c => renderComment(c))}
        </div>
      ) : (
        <div className="text-center py-8 bg-[#151f2e] rounded-xl border border-white/[0.04]">
          <svg className="w-10 h-10 text-zinc-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <p className="text-zinc-500 text-xs">No comments yet. Be the first!</p>
        </div>
      )}
    </div>
  );
}
