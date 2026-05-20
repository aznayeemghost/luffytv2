"use client";

import { create } from "zustand";

// ============================================================
// Anime Types (from AllAnime + Miruro)
// ============================================================

export interface AnimeItem {
  _id: string;
  name: string;
  englishName?: string;
  thumbnail?: string;
  score?: number;
  type?: string;
  status?: string;
  genres?: string[];
  availableEpisodes?: Record<string, number>;
  season?: string;
  description?: string;
}

export interface MiruroAnimeItem {
  id: number;
  title: { romaji?: string; english?: string; native?: string };
  coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string };
  bannerImage?: string;
  genres?: string[];
  averageScore?: number;
  popularity?: number;
  episodes?: number;
  type?: string;
  status?: string;
  description?: string;
  season?: string;
  seasonYear?: number;
  countryOfOrigin?: string;
}

// ============================================================
// TMDB Content Types
// ============================================================

export interface TMDBContentItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  vote_count?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity?: number;
  media_type?: "movie" | "tv";
  adult?: boolean;
  origin_country?: string[];
  original_language?: string;
}

// ============================================================
// Bookmark & History
// ============================================================

export interface BookmarkItem {
  id: string;
  animeId: string;
  animeName: string;
  thumbnail?: string;
  score?: number;
  type?: string;
  status?: string;
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  animeId: string;
  animeName: string;
  thumbnail?: string;
  episodeNum: number;
  progress: number;
  duration: number;
  updatedAt: string;
}

// ============================================================
// Route Types
// ============================================================

type Route =
  | { page: "home" }
  | { page: "search"; query?: string }
  | { page: "anime"; id: string }
  | { page: "watch"; id: string; episode: number; title?: string; image?: string }
  | { page: "genre"; genre: string }
  | { page: "bookmarks" }
  | { page: "history" }
  | { page: "dub" }
  | { page: "schedule" }
  | { page: "movies" }
  | { page: "tv" }
  | { page: "manga" }
  | { page: "manga-detail"; id: string }
  | { page: "manga-read"; id: string; chapterId: string }
  | { page: "movie-detail"; id: number }
  | { page: "tv-detail"; id: number }
  | { page: "movie-watch"; id: number }
  | { page: "tv-watch"; id: number; season: number; episode: number };

// ============================================================
// App Store
// ============================================================

interface AppState {
  route: Route;
  navigate: (route: Route) => void;
  bookmarks: BookmarkItem[];
  setBookmarks: (items: BookmarkItem[]) => void;
  history: HistoryItem[];
  setHistory: (items: HistoryItem[]) => void;
  isBookmarked: (animeId: string) => boolean;
}

export const useAppStore = create<AppState>((set, get) => ({
  route: { page: "home" },
  navigate: (route) => {
    set({ route });
    if (typeof window !== "undefined") {
      if (route.page === "home") window.location.hash = "";
      else if (route.page === "search" && route.query)
        window.location.hash = `search/${encodeURIComponent(route.query)}`;
      else if (route.page === "search") window.location.hash = "search";
      else if (route.page === "anime")
        window.location.hash = `anime/${route.id}`;
      else if (route.page === "watch")
        window.location.hash = `watch/${route.id}/${route.episode}`;
      else if (route.page === "genre")
        window.location.hash = `genre/${encodeURIComponent(route.genre)}`;
      else if (route.page === "bookmarks") window.location.hash = "bookmarks";
      else if (route.page === "history") window.location.hash = "history";
      else if (route.page === "dub") window.location.hash = "dub";
      else if (route.page === "schedule") window.location.hash = "schedule";
      else if (route.page === "movies") window.location.hash = "movies";
      else if (route.page === "tv") window.location.hash = "tv";
      else if (route.page === "manga") window.location.hash = "manga";
      else if (route.page === "manga-detail")
        window.location.hash = `manga/${route.id}`;
      else if (route.page === "manga-read")
        window.location.hash = `read-manga/${route.id}/${route.chapterId}`;
      else if (route.page === "movie-detail")
        window.location.hash = `movie/${route.id}`;
      else if (route.page === "tv-detail")
        window.location.hash = `tvshow/${route.id}`;
      else if (route.page === "movie-watch")
        window.location.hash = `watch-movie/${route.id}`;
      else if (route.page === "tv-watch")
        window.location.hash = `watch-tv/${route.id}/${route.season}/${route.episode}`;
      window.scrollTo(0, 0);
    }
  },
  bookmarks: [],
  setBookmarks: (items) => set({ bookmarks: items }),
  history: [],
  setHistory: (items) => set({ history: items }),
  isBookmarked: (animeId) => get().bookmarks.some((b) => b.animeId === animeId),
}));

export function parseHash(hash: string): Route {
  const h = hash.replace("#", "");
  if (!h) return { page: "home" };
  const parts = h.split("/");
  if (parts[0] === "search") return { page: "search", query: decodeURIComponent(parts[1] || "") };
  if (parts[0] === "anime" && parts[1]) return { page: "anime", id: parts[1] };
  if (parts[0] === "watch" && parts[1] && parts[2])
    return { page: "watch", id: parts[1], episode: parseFloat(parts[2]) };
  if (parts[0] === "genre" && parts[1]) return { page: "genre", genre: decodeURIComponent(parts[1]) };
  if (parts[0] === "bookmarks") return { page: "bookmarks" };
  if (parts[0] === "history") return { page: "history" };
  if (parts[0] === "dub") return { page: "dub" };
  if (parts[0] === "schedule") return { page: "schedule" };
  if (parts[0] === "movies") return { page: "movies" };
  if (parts[0] === "tv") return { page: "tv" };
  if (parts[0] === "manga" && parts[1]) return { page: "manga-detail", id: parts[1] };
  if (parts[0] === "manga") return { page: "manga" };
  if (parts[0] === "read-manga" && parts[1] && parts[2])
    return { page: "manga-read", id: parts[1], chapterId: parts[2] };
  if (parts[0] === "movie" && parts[1]) return { page: "movie-detail", id: parseInt(parts[1]) };
  if (parts[0] === "tvshow" && parts[1]) return { page: "tv-detail", id: parseInt(parts[1]) };
  if (parts[0] === "watch-movie" && parts[1]) return { page: "movie-watch", id: parseInt(parts[1]) };
  if (parts[0] === "watch-tv" && parts[1] && parts[2] && parts[3])
    return { page: "tv-watch", id: parseInt(parts[1]), season: parseInt(parts[2]), episode: parseInt(parts[3]) };
  return { page: "home" };
}

// ============================================================
// Helper Functions
// ============================================================

export function getAnimeTitle(anime: AnimeItem | MiruroAnimeItem): string {
  if (!anime) return "Unknown";
  if ("name" in anime) return anime.englishName || anime.name || "Unknown";
  const title = anime.title;
  if (!title) return "Unknown";
  return title.english || title.romaji || title.native || "Unknown";
}

export function getAnimeImage(anime: AnimeItem | MiruroAnimeItem): string {
  if (!anime) return "";
  if ("thumbnail" in anime) return anime.thumbnail || "";
  const cover = anime.coverImage;
  if (!cover) return "";
  return cover.extraLarge || cover.large || cover.medium || "";
}

export function getTMDBTitle(item: TMDBContentItem): string {
  return item.title || item.name || item.original_title || item.original_name || "Unknown";
}

export function getTMDBImage(item: TMDBContentItem): string {
  if (item.poster_path) return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
  return "";
}

export function getTMDBBackdrop(item: TMDBContentItem): string {
  if (item.backdrop_path) return `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;
  return "";
}

export function getTMDBYear(item: TMDBContentItem): string {
  const date = item.release_date || item.first_air_date;
  return date ? date.split("-")[0] : "";
}

export function getTMDBMediaType(item: TMDBContentItem): "movie" | "tv" {
  if (item.media_type === "movie" || item.media_type === "tv") return item.media_type;
  if (item.release_date || item.original_title) return "movie";
  return "tv";
}
