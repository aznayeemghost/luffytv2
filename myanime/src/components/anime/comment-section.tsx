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
  replies?: CommentData[];
}

interface RatingStats {
  ratingAvg: number;
  ratingCount: number;
  distribution: Array<{ star: number; count: number }>;
}

interface CommentSectionProps {
  animeId: string;
  animeTitle?: string;
}

// ── Random avatar color generator ──
function avatarColor(name: string) {
  const colors = [
    "from-purple-500 to-violet-600",
    "from-blue-500 to-cyan-600",
    "from-emerald-500 to-teal-600",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-pink-600",
    "from-indigo-500 to-blue-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ── Time ago ──
function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Interactive Star Rating Picker ──
function StarPicker({ value, onChange, size = "md" }: { value: number; onChange: (v: number) => void; size?: "sm" | "md" }) {
  const [hover, setHover] = useState(0);
  const starClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <svg
            className={`${starClass} transition-colors ${
              star <= (hover || value) ? "text-amber-400" : "text-zinc-600"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1.5 text-sm font-bold text-amber-400">{value}.0</span>
      )}
    </div>
  );
}

// ── Static Star Display ──
function StarDisplay({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const starClass = size === "sm" ? "w-3 h-3" : "w-5 h-5";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg
          key={star}
          className={`${starClass} ${star <= rating ? "text-amber-400" : "text-zinc-700"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

// ── Single Comment Card ──
function CommentCard({
  comment,
  userId,
  onLike,
  onReply,
  onDelete,
}: {
  comment: CommentData;
  userId: string;
  onLike: (id: string) => void;
  onReply: (parentId: string, username: string) => void;
  onDelete: (id: string) => void;
}) {
  const isOwner = comment.username === userId;

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(comment.username)} flex items-center justify-center shrink-0 text-white text-sm font-bold shadow-lg`}>
          {comment.username.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">{comment.username}</span>
            {comment.rating && (
              <div className="flex items-center gap-0.5 sm:gap-1">
                <StarDisplay rating={comment.rating} />
                <span className="text-[9px] sm:text-[10px] font-bold text-amber-400">{comment.rating}.0</span>
              </div>
            )}
            <span className="text-[9px] sm:text-[10px] text-zinc-600">{timeAgo(comment.createdAt)}</span>
          </div>

          {/* Content */}
          <p className="text-sm text-zinc-300 mt-1 leading-relaxed whitespace-pre-wrap break-words">
            {comment.content}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-purple-400 transition-colors group/like"
            >
              <svg className="w-3.5 h-3.5 group-hover/like:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {comment.likes > 0 && <span>{comment.likes}</span>}
            </button>
            <button
              onClick={() => onReply(comment.id, comment.username)}
              className="text-[11px] text-zinc-500 hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Reply
            </button>
            {isOwner && (
              <button
                onClick={() => onDelete(comment.id)}
                className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            )}
          </div>

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-2 pl-4 border-l border-white/[0.06] space-y-3">
              {comment.replies.map(reply => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  userId={userId}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──
export default function CommentSection({ animeId, animeTitle }: CommentSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [stats, setStats] = useState<RatingStats>({ ratingAvg: 0, ratingCount: 0, distribution: [] });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"newest" | "oldest" | "top">("newest");

  // Form state
  const [username, setUsername] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<{ parentId: string; username: string } | null>(null);

  // Current user ID (from localStorage — simple anonymous)
  const [userId, setUserId] = useState("");
  useEffect(() => {
    let id = localStorage.getItem("luffytv_userId");
    if (!id) {
      id = "user_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("luffytv_userId", id);
    }
    setUserId(id);

    const savedName = localStorage.getItem("luffytv_username");
    if (savedName) setUsername(savedName);
  }, []);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?animeId=${encodeURIComponent(animeId)}&sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
        setStats(data.stats || { ratingAvg: 0, ratingCount: 0, distribution: [] });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [animeId, sort]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!username.trim() || !content.trim()) return;
    setSubmitting(true);

    try {
      localStorage.setItem("luffytv_username", username.trim());

      const body: Record<string, unknown> = {
        animeId,
        username: username.trim(),
        content: content.trim(),
        rating: rating > 0 ? rating : undefined,
      };

      if (replyTo) {
        body.parentId = replyTo.parentId;
      }

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setContent("");
        setRating(0);
        setReplyTo(null);
        fetchComments();
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  const handleLike = async (commentId: string) => {
    if (!userId) return;
    try {
      const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, action: "like", userId }),
      });
      if (res.ok) fetchComments();
    } catch { /* ignore */ }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, action: "delete" }),
      });
      if (res.ok) fetchComments();
    } catch { /* ignore */ }
  };

  const handleReply = (parentId: string, parentUsername: string) => {
    setReplyTo({ parentId, username: parentUsername });
    // Scroll to form
    document.getElementById("comment-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Max count for distribution bar
  const maxDistCount = Math.max(...stats.distribution.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* ══════ Rating Overview ══════ */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 bg-[#0d0d0d] rounded-xl border border-white/[0.06]">
        {/* Average rating */}
        <div className="flex flex-col items-center justify-center sm:w-[120px] shrink-0">
          <div className="text-3xl sm:text-5xl font-black text-white">
            {stats.ratingAvg > 0 ? stats.ratingAvg.toFixed(1) : "—"}
          </div>
          <div className="mt-1">
            <StarDisplay rating={Math.round(stats.ratingAvg)} size="md" />
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {stats.ratingCount > 0
              ? `${stats.ratingCount} rating${stats.ratingCount !== 1 ? "s" : ""}`
              : "No ratings yet"}
          </p>
        </div>

        {/* Distribution bars */}
        <div className="flex-1 space-y-1 sm:space-y-1.5 min-w-0">
          {[5, 4, 3, 2, 1].map(star => {
            const dist = stats.distribution.find(d => d.star === star);
            const count = dist?.count || 0;
            const pct = stats.ratingCount > 0 ? (count / stats.ratingCount) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] text-zinc-400 w-3 text-right">{star}</span>
                <svg className="w-3 h-3 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <div className="flex-1 h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(pct, stats.ratingCount > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="text-[9px] sm:text-[10px] text-zinc-500 w-5 sm:w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════ Comment Form ══════ */}
      <div id="comment-form" className="p-5 bg-[#0d0d0d] rounded-xl border border-white/[0.06]">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {replyTo ? `Reply to @${replyTo.username}` : "Leave a Review"}
          {replyTo && (
            <button
              onClick={() => setReplyTo(null)}
              className="ml-auto text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Cancel Reply
            </button>
          )}
        </h4>

        <div className="space-y-3">
          {/* Username + Rating row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={30}
              className="flex-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Rate:</span>
              <StarPicker value={rating} onChange={setRating} />
              {rating > 0 && (
                <button
                  onClick={() => setRating(0)}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <textarea
            placeholder={replyTo ? `Write a reply to @${replyTo.username}...` : "Share your thoughts about this anime..."}
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none"
          />

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">{content.length}/1000</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || !username.trim() || !content.trim()}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {submitting ? "Posting..." : replyTo ? "Post Reply" : "Post Review"}
            </button>
          </div>
        </div>
      </div>

      {/* ══════ Comments List ══════ */}
      <div>
        {/* Sort bar */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            Reviews & Comments
            <span className="text-[10px] font-normal text-zinc-500">({comments.length})</span>
          </h4>
          <div className="flex items-center gap-0.5 bg-[#1a1a1a] rounded-full p-0.5 border border-white/[0.06]">
            {(["newest", "oldest", "top"] as const).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`px-2.5 sm:px-3 py-1 text-[9px] sm:text-[10px] font-bold rounded-full transition-all ${
                  sort === s ? "bg-purple-500/15 text-purple-300" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-3 p-4 bg-[#0d0d0d] rounded-xl border border-white/[0.04]">
                <div className="w-9 h-9 rounded-full skeleton shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 skeleton rounded" />
                  <div className="h-3 w-full skeleton rounded" />
                  <div className="h-3 w-2/3 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-16 h-16 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 font-medium">No reviews yet</p>
            <p className="text-xs text-zinc-600 mt-1">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="p-4 bg-[#0d0d0d] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-colors">
                <CommentCard
                  comment={comment}
                  userId={username}
                  onLike={handleLike}
                  onReply={handleReply}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
