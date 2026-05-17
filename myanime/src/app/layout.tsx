import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoAnime — Anime, Movies & TV Shows",
  description: "Stream anime, movies, and TV shows online free. Watch subbed & dubbed anime, trending movies, popular TV series all in one place.",
  keywords: [
    "anime", "watch anime online", "free anime streaming", "movies",
    "TV shows", "HD anime", "trending anime", "GoAnime", "streaming",
    "subbed", "dubbed", "watch movies free", "watch TV shows online",
  ],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📺</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0f19] text-[#e2e8f0] selection:bg-purple-500/30 selection:text-white`}
      >
        {children}
      </body>
    </html>
  );
}
