"use client";

import { useAppStore } from "./store";

/* ─── Category options ─── */
const categories = [
  {
    id: "anime",
    title: "Anime",
    desc: "Watch the latest episodes and classic series",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="20" />
        <path d="M16 28s3 4 8 4 8-4 8-4" />
        <circle cx="18" cy="19" r="2.5" />
        <circle cx="30" cy="19" r="2.5" />
      </svg>
    ),
    color: "#7c6cf0",
    page: "dub" as const,
  },
  {
    id: "movies",
    title: "Movies",
    desc: "Stream blockbuster films and indie gems",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="40" height="40" rx="4" />
        <line x1="14" y1="4" x2="14" y2="44" />
        <line x1="34" y1="4" x2="34" y2="44" />
        <line x1="4" y1="24" x2="44" y2="24" />
      </svg>
    ),
    color: "#4a9eff",
    page: "movies" as const,
  },
  {
    id: "tvshows",
    title: "TV Shows",
    desc: "Binge popular TV series from around the world",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="8" width="40" height="28" rx="3" />
        <line x1="16" y1="42" x2="32" y2="42" />
        <line x1="24" y1="36" x2="24" y2="42" />
        <polyline points="16 20 22 24 16 28" />
        <line x1="26" y1="28" x2="34" y2="28" />
      </svg>
    ),
    color: "#e05c9c",
    page: "tv" as const,
  },
  {
    id: "live",
    title: "Live TV",
    desc: "Watch live sports and TV channels worldwide",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="24" r="20" />
        <circle cx="24" cy="24" r="8" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
    ),
    color: "#ef4444",
    page: "live" as any,
  },
  {
    id: "manga",
    title: "Manga",
    desc: "Read your favorite manga chapters online",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 39A5 5 0 0113 34h27" />
        <path d="M13 4h27v40H13a5 5 0 01-5-5V9a5 5 0 015-5z" />
        <line x1="20" y1="14" x2="33" y2="14" />
        <line x1="20" y1="22" x2="33" y2="22" />
        <line x1="20" y1="30" x2="28" y2="30" />
      </svg>
    ),
    color: "#2dd4a0",
    page: "manga" as const,
  },
  {
    id: "novels",
    title: "Novels",
    desc: "Dive into light novels and web novels",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 40h40" />
        <path d="M8 36V8a2 2 0 012-2h12l4 4h12a2 2 0 012 2v24" />
        <path d="M8 40V14a2 2 0 012-2h12l4 4h12a2 2 0 012 2v26" />
        <line x1="20" y1="20" x2="28" y2="20" />
        <line x1="20" y1="26" x2="28" y2="26" />
      </svg>
    ),
    color: "#f59e0b",
    page: "manga" as const, // Routes to manga for now
  },
  {
    id: "community",
    title: "Community",
    desc: "Join guilds, chat, and connect with fans",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M33 19a6 6 0 100-12 6 6 0 000 12z" />
        <path d="M15 19a6 6 0 100-12 6 6 0 000 12z" />
        <path d="M40 38a10 10 0 00-7-9.5" />
        <path d="M15 28.5A10 10 0 005 38" />
        <path d="M24 28a10 10 0 0110 10" />
        <path d="M24 28a10 10 0 00-10 10" />
      </svg>
    ),
    color: "#6366f1",
    page: "home" as const,
  },
  {
    id: "discord",
    title: "Discord",
    desc: "Join our Discord server for real-time chat",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 22a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
        <path d="M30 22a1 1 0 100-2 1 1 0 000 2z" fill="currentColor" />
        <path d="M16 16s4-2 8-2 8 2 8 2" />
        <path d="M16 32s4 2 8 2 8-2 8-2" />
        <path d="M12 20c0-6 6-12 12-12s12 6 12 12v8c0 6-6 12-12 12s-12-6-12-12v-8z" />
      </svg>
    ),
    color: "#5865F2",
    page: "home" as const,
  },
  {
    id: "guilds",
    title: "Guilds",
    desc: "Create or join guilds with like-minded fans",
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M24 4l6 12h12l-10 8 4 12-12-8-12 8 4-12L6 16h12z" />
      </svg>
    ),
    color: "#f472b6",
    page: "home" as const,
  },
];

export default function WatchNowPage() {
  const navigate = useAppStore(s => s.navigate);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8">

      {/* ─── Logo ─── */}
      <div className="lunar-fade-in-up mb-10 flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c6cf0] to-[#6b5ce0] flex items-center justify-center shadow-[0_0_24px_rgba(124,108,240,0.3)]">
          <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        <span
          className="text-lg font-bold tracking-wide"
          style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
        >
          LUFFY <span className="text-[#7c6cf0]">TV</span>
        </span>
      </div>

      {/* ─── Title ─── */}
      <h1
        className="lunar-fade-in-up lunar-delay-2 text-3xl sm:text-4xl lg:text-5xl font-bold text-white text-center mb-3"
        style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
      >
        What do you want to watch?
      </h1>

      {/* ─── Subtitle ─── */}
      <p
        className="lunar-fade-in-up lunar-delay-3 text-[15px] text-white/35 text-center mb-12 max-w-md"
        style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
      >
        Choose a category and start exploring. Everything is free, no sign-up needed.
      </p>

      {/* ─── Live TV & Sports Banner ─── */}
      <div className="w-full max-w-2xl mb-8">
        <button
          onClick={() => navigate({ page: "live" })}
          className="lunar-fade-in-up group relative w-full flex items-center gap-5 p-5 sm:p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] overflow-hidden"
          style={{
            animationDelay: "0.25s",
            animationFillMode: "both",
            background: "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(249,115,22,0.06) 50%, rgba(234,179,8,0.04) 100%)",
            borderColor: "rgba(239,68,68,0.15)",
          }}
        >
          {/* Animated background pulse */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(239,68,68,0.1) 0%, transparent 60%)" }}
          />

          {/* Icon with live pulse */}
          <div className="relative z-[1] flex items-center justify-center w-14 h-14 rounded-xl border shrink-0"
            style={{
              background: "rgba(239,68,68,0.1)",
              borderColor: "rgba(239,68,68,0.2)",
            }}
          >
            <svg className="w-7 h-7 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            {/* Live pulse dot */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
            </span>
          </div>

          {/* Text */}
          <div className="relative z-[1] flex-1 text-left">
            <div className="flex items-center gap-2.5 mb-1">
              <span
                className="text-[14px] sm:text-[15px] font-bold text-white group-hover:text-red-300 transition-colors"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                LIVE TV & SPORTS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/20">
                LIVE
              </span>
            </div>
            <p
              className="text-[12px] sm:text-[13px] text-white/40 group-hover:text-white/55 transition-colors"
              style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
            >
              Watch live sports, TV channels & real-time streams
            </p>
          </div>

          {/* Arrow */}
          <svg className="relative z-[1] w-5 h-5 text-white/20 group-hover:text-red-400 group-hover:translate-x-1 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ─── Category Grid ─── */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <button
              key={cat.id}
              onClick={() => navigate(cat.id === "live" ? { page: "live" } as any : { page: cat.page })}
              className="lunar-fade-in-up group relative flex flex-col items-center gap-3 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 hover:scale-[1.03]"
              style={{
                animationDelay: `${0.3 + i * 0.08}s`,
                animationFillMode: "both",
              }}
            >
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
                style={{ background: `radial-gradient(ellipse at center, ${cat.color}15 0%, transparent 70%)` }}
              />

              {/* Icon */}
              <div
                className="relative z-[1] flex items-center justify-center w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] group-hover:border-white/[0.1] transition-colors"
                style={{ color: cat.color }}
              >
                {cat.icon}
              </div>

              {/* Title */}
              <span
                className="relative z-[1] text-[13px] font-bold text-white/80 group-hover:text-white transition-colors"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {cat.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Footer hint ─── */}
      <p
        className="lunar-fade-in-up mt-10 text-[12px] text-white/15"
        style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif", animationDelay: "1s", animationFillMode: "both" }}
      >
        All content is free. No sign-up required.
      </p>
    </div>
  );
}
