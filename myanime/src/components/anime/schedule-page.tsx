"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "./store";
import type { MegaPlayScheduleItem, MegaPlayScheduleData } from "@/lib/megaplay-api";

export default function SchedulePage() {
  const navigate = useAppStore(s => s.navigate);
  const [schedules, setSchedules] = useState<MegaPlayScheduleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const res = await fetch(`/api/megaplay/schedule?page=${page}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.results?.schedules) {
            setSchedules(data.results.schedules);
          }
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    loadSchedule();
  }, [page]);

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return "Airing now";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Airing Schedule</h1>
          <p className="text-sm text-zinc-500 mt-1">Upcoming anime episodes and countdowns</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="pill-btn pill-btn-ghost text-xs py-1.5 px-3 disabled:opacity-30"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M15 19l-7-7 7-7" /></svg>
            Prev
          </button>
          <span className="text-xs text-zinc-500">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
          >
            Next
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Schedule */}
      {loading ? (
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-40 skeleton rounded" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 p-3 bg-[#111111] rounded-xl">
                    <div className="w-12 h-16 skeleton rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 skeleton rounded" />
                      <div className="h-2 w-1/2 skeleton rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : schedules.length > 0 ? (
        <div className="space-y-8">
          {schedules.map((day, dayIdx) => (
            <div key={dayIdx} className="space-y-3">
              {/* Day header */}
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">{formatDate(day.date)}</h2>
                <span className="text-[10px] text-zinc-500 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  {day.schedule?.length || 0} episodes
                </span>
                {dayIdx === 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    NEAREST
                  </span>
                )}
              </div>

              {/* Episodes grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {day.schedule?.map((item: MegaPlayScheduleItem) => {
                  const title = item.title?.english || item.title?.romaji || "Unknown";
                  const image = item.coverImage?.large || item.coverImage?.medium || "";
                  const countdown = item.timeUntilAiring > 0 ? formatCountdown(item.timeUntilAiring) : "Airing now";
                  const isAiring = item.timeUntilAiring <= 0;

                  return (
                    <button
                      key={`${item.id}-${item.episode_no}`}
                      onClick={() => navigate({ page: "anime", id: String(item.id) })}
                      className="flex items-center gap-3 p-3 bg-[#111111] rounded-xl border border-white/[0.03] hover:bg-white/[0.04] hover:border-purple-500/20 transition-all group text-left"
                    >
                      {/* Cover image */}
                      <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 bg-[#1a1a1a]">
                        {image ? (
                          <img src={image} alt={title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-transparent">
                            <span className="text-xs font-bold text-purple-400">EP{item.episode_no}</span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-300 line-clamp-1 group-hover:text-purple-300 transition-colors">
                          {title}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          Episode {item.episode_no}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Countdown or airing status */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isAiring
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-purple-500/10 text-purple-400"
                          }`}>
                            {isAiring ? "🔴 Airing" : `⏱ ${countdown}`}
                          </span>
                          {item.airingTime && (
                            <span className="text-[9px] text-zinc-600">{item.airingTime}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl bg-[#0a0a0a] border border-white/[0.04] p-8">
          <svg className="w-12 h-12 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <p className="text-zinc-400 text-sm">Schedule data unavailable</p>
          <p className="text-zinc-600 text-xs mt-1">Try refreshing the page</p>
        </div>
      )}
    </div>
  );
}
