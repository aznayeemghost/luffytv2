"use client";

import { useState } from "react";
import { useAppStore } from "./store";

/* ─── Guide data sections ─── */
const guideSections = [
  {
    id: "getting-started",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
    title: "Getting Started",
    color: "#7c6cf0",
    items: [
      {
        q: "How do I start watching anime?",
        a: "Simply click \"Watch Now\" on the homepage or use the search bar to find any anime. Click on an anime card to see details, then hit the play button on any episode to start streaming instantly — no sign-up required."
      },
      {
        q: "Do I need to create an account?",
        a: "No! Luffy TV is completely free and requires no registration. Just open the site and start watching. However, creating bookmarks and watch history requires local storage access in your browser."
      },
      {
        q: "Is Luffy TV really free?",
        a: "Yes, 100% free with zero ads. We believe anime should be accessible to everyone. No hidden fees, no premium tiers, no credit card required."
      },
    ]
  },
  {
    id: "watching",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Watching Anime",
    color: "#4a9eff",
    items: [
      {
        q: "How do I switch between SUB, DUB, and Hindi?",
        a: "On the watch page, you'll find a toggle in the episode sidebar that lets you switch between SUB (subtitled), DUB (English dubbed), and HINDI DUB. The available servers will update automatically based on your selection."
      },
      {
        q: "Why is the video not loading?",
        a: "Try switching to a different server using the server list below the player. If that doesn't work, try the \"Proxy\" mode button. Some servers may be temporarily down — we provide multiple backup servers for every episode."
      },
      {
        q: "What do the server colors mean?",
        a: "Each server has a colored dot indicating its source. Purple servers use AniList IDs, blue servers use MAL IDs, and green servers are universal. All servers provide the same content — just different hosting sources."
      },
      {
        q: "How do I switch episodes?",
        a: "Use the episode list on the right side of the watch page. Click any episode number to jump to it. The currently playing episode is highlighted with a purple accent and a play icon."
      },
    ]
  },
  {
    id: "features",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    title: "Features & Tools",
    color: "#2dd4a0",
    items: [
      {
        q: "How do Bookmarks work?",
        a: "Click the bookmark icon on any anime card or detail page. Your bookmarks are saved in your browser's local storage so they persist between sessions. Access all bookmarks from the \"Bookmarks\" page in the navigation."
      },
      {
        q: "How does Watch History work?",
        a: "Every anime you watch is automatically tracked. Your watch history shows which episodes you've viewed and your progress. This is stored locally in your browser — we don't track anything on our servers."
      },
      {
        q: "What's the search shortcut?",
        a: "Press Cmd+K (Mac) or Ctrl+K (Windows/Linux) to instantly open the search bar from anywhere on the site. Start typing to search across thousands of anime titles."
      },
      {
        q: "Can I browse by genre?",
        a: "Yes! Click on any genre tag on an anime card, or visit the \"Watch Now\" page which has genre categories. You can also search for genres directly in the search bar."
      },
    ]
  },
  {
    id: "content",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
    title: "Content & Categories",
    color: "#e05c9c",
    items: [
      {
        q: "What anime are available?",
        a: "Luffy TV has a library of over 10,000 anime series, 5,000+ movies, and 8,000+ manga titles. We cover everything from classic series like Dragon Ball and Naruto to the latest seasonal releases like Jujutsu Kaisen and Chainsaw Man."
      },
      {
        q: "Can I watch Movies and TV Shows?",
        a: "Absolutely! Use the \"Movies\" and \"TV Shows\" tabs in the navigation to browse our full catalog of anime films and live-action content sourced from TMDB."
      },
      {
        q: "Is Manga available?",
        a: "Yes! Visit the \"Manga\" section to browse thousands of manga titles. Click on any manga to see details and start reading with our built-in manga reader."
      },
      {
        q: "How often is content updated?",
        a: "New episodes are added as they air in Japan. We update our catalog daily with the latest releases. Check the trending section for the most popular currently airing anime."
      },
    ]
  },
  {
    id: "troubleshooting",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
    title: "Troubleshooting",
    color: "#f59e0b",
    items: [
      {
        q: "The player shows a black screen",
        a: "This usually means the server is loading. Wait 5-10 seconds for the video to buffer. If it stays black, try switching to a different server or enabling Proxy mode. Ad-blockers can sometimes interfere — try disabling yours for this site."
      },
      {
        q: "Video is buffering constantly",
        a: "Lower the video quality using the player's built-in settings (gear icon). Switch to a server closer to your region. Close other tabs that use bandwidth. If using a VPN, try a different server location."
      },
      {
        q: "Episode list is empty or loading forever",
        a: "Refresh the page. If the issue persists, the anime data might be temporarily unavailable from our source. Try searching for the anime again and opening it from the search results."
      },
      {
        q: "I can't find a specific anime",
        a: "Try searching with both the English and Japanese title. Some anime may be listed under alternative names. If you still can't find it, the title might not be in our database yet."
      },
    ]
  },
];

/* ─── Quick tips for the top banner ─── */
const quickTips = [
  { emoji: "1", text: "Browse & Search", desc: "Find anime by name, genre, or browse trending" },
  { emoji: "2", text: "Click & Play", desc: "One click to start streaming any episode" },
  { emoji: "3", text: "Customize", desc: "Choose SUB, DUB, or Hindi with multiple servers" },
  { emoji: "4", text: "Save & Track", desc: "Bookmark favorites and track watch history" },
];

/* ─── FAQ Accordion Item ─── */
function AccordionItem({ item, isOpen, onToggle, accentColor }: {
  item: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
}) {
  return (
    <div className="border border-white/[0.04] rounded-xl overflow-hidden transition-all" style={{ borderColor: isOpen ? `${accentColor}22` : undefined }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/[0.015] transition-colors"
      >
        <span
          className="text-sm font-semibold text-white/80 pr-4"
          style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
        >
          {item.q}
        </span>
        <div
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-300"
          style={{
            background: isOpen ? `${accentColor}18` : "rgba(255,255,255,0.04)",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: isOpen ? accentColor : "rgba(255,255,255,0.3)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: isOpen ? 500 : 0, opacity: isOpen ? 1 : 0 }}
      >
        <div className="px-4 pb-4 pt-0">
          <p
            className="text-[13px] text-white/45 leading-relaxed"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            {item.a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Guide Section Block ─── */
function GuideSection({ section, openIndex, onToggle }: {
  section: typeof guideSections[0];
  openIndex: number | null;
  onToggle: (i: number) => void;
}) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${section.color}12`, color: section.color }}
        >
          {section.icon}
        </div>
        <h3
          className="text-base font-bold"
          style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace", color: section.color }}
        >
          {section.title}
        </h3>
        <div className="flex-1 h-px" style={{ background: `${section.color}15` }} />
      </div>

      {/* Accordion items */}
      <div className="space-y-2">
        {section.items.map((item, i) => (
          <AccordionItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => onToggle(openIndex === i ? -1 : i)}
            accentColor={section.color}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   GUIDE PAGE — Full help & usage guide for Luffy TV
   ═══════════════════════════════════════════════════════════════ */
export default function GuidePage() {
  const navigate = useAppStore(s => s.navigate);
  const [openItems, setOpenItems] = useState<Record<string, number | null>>({});

  const handleToggle = (sectionId: string, itemIndex: number) => {
    setOpenItems(prev => ({
      ...prev,
      [sectionId]: prev[sectionId] === itemIndex ? null : itemIndex,
    }));
  };

  const [searchQuery, setSearchQuery] = useState("");

  // Filter sections based on search
  const filteredSections = guideSections.map(section => ({
    ...section,
    items: section.items.filter(
      item =>
        !searchQuery ||
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(section => section.items.length > 0);

  return (
    <div className="fade-in max-w-4xl mx-auto px-4 sm:px-6 pb-20" style={{ marginTop: -75 }}>

      {/* ═══ HERO BANNER ═══ */}
      <section className="relative overflow-hidden rounded-2xl mb-8" style={{ background: "linear-gradient(135deg, #0f0a1e 0%, #0a0f1e 50%, #0f1a1e 100%)" }}>
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(124,108,240,0.12) 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(74,158,255,0.08) 0%, transparent 70%)", filter: "blur(50px)" }} />

        {/* Decorative dots */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

        <div className="relative z-10 py-10 px-6 sm:px-10 text-center">
          {/* Cat mascot */}
          <div className="mb-5 flex justify-center">
            <svg className="w-16 h-14" viewBox="0 0 140 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="68" cy="74" rx="20" ry="18" fill="#e8e6f0" />
              <circle cx="68" cy="55" r="16" fill="#e8e6f0" />
              <path d="M54 46 L49 26 L60 42 Z" fill="#e8e6f0" />
              <path d="M82 46 L87 26 L76 42 Z" fill="#e8e6f0" />
              <path d="M55 45 L51 29 L60 42 Z" fill="#d4c8f0" />
              <path d="M81 45 L85 29 L76 42 Z" fill="#d4c8f0" />
              <ellipse cx="62" cy="52" rx="3.5" ry="4" fill="#7c6cf0" />
              <ellipse cx="74" cy="52" rx="3.5" ry="4" fill="#7c6cf0" />
              <circle cx="63.5" cy="50.5" r="1.2" fill="#fff" />
              <circle cx="75.5" cy="50.5" r="1.2" fill="#fff" />
              <ellipse cx="68" cy="57" rx="1.8" ry="1.2" fill="#d4a0c0" />
              <path d="M66 59 Q68 61 70 59" stroke="#c4a0c0" strokeWidth="0.8" fill="none" />
              <path d="M88 74 Q100 65, 96 52 Q94 46, 92 48" stroke="#d4c8f0" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>

          <h1
            className="text-2xl sm:text-4xl font-black text-white mb-3"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            How to Use Luffy TV
          </h1>
          <p
            className="text-sm sm:text-base text-white/40 max-w-lg mx-auto"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            Everything you need to know about streaming anime, managing your watchlist, and getting the best experience on Luffy TV.
          </p>

          {/* Search bar */}
          <div className="mt-6 max-w-md mx-auto relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the guide..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/40 focus:bg-white/[0.06] transition-all"
              style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
            />
          </div>
        </div>
      </section>

      {/* ═══ QUICK STEPS ═══ */}
      <section className="mb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickTips.map((tip, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl p-4 border border-white/[0.04] transition-all hover:border-white/[0.08]"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)" }}
            >
              {/* Step number */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black mb-3"
                style={{
                  fontFamily: "var(--font-space-mono), 'Space Mono', monospace",
                  background: "rgba(124,108,240,0.12)",
                  color: "#7c6cf0",
                }}
              >
                {tip.emoji}
              </div>
              <h4
                className="text-sm font-bold text-white/80 mb-1"
                style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
              >
                {tip.text}
              </h4>
              <p
                className="text-[11px] text-white/35 leading-relaxed"
                style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
              >
                {tip.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ GUIDE SECTIONS ═══ */}
      <section className="space-y-10">
        {filteredSections.map(section => (
          <GuideSection
            key={section.id}
            section={section}
            openIndex={openItems[section.id] ?? null}
            onToggle={(i) => handleToggle(section.id, i)}
          />
        ))}

        {filteredSections.length === 0 && searchQuery && (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-full bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p className="text-sm text-white/30" style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}>
              No results for &ldquo;{searchQuery}&rdquo;. Try different keywords.
            </p>
          </div>
        )}
      </section>

      {/* ═══ STILL NEED HELP? ═══ */}
      <section className="mt-14 relative overflow-hidden rounded-2xl border border-white/[0.04]" style={{ background: "linear-gradient(135deg, rgba(124,108,240,0.06) 0%, rgba(74,158,255,0.04) 100%)" }}>
        <div className="py-10 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3
            className="text-lg font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace" }}
          >
            Still need help?
          </h3>
          <p
            className="text-[13px] text-white/40 mb-5 max-w-sm mx-auto"
            style={{ fontFamily: "var(--font-inter), 'Inter', sans-serif" }}
          >
            Can&apos;t find what you&apos;re looking for? Reach out to us and we&apos;ll get back to you as soon as possible.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => navigate({ page: "contact" })}
              className="lunar-btn-primary text-xs"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Contact Us
            </button>
            <button
              onClick={() => navigate({ page: "home" })}
              className="lunar-btn-ghost text-xs"
            >
              Back to Home
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
