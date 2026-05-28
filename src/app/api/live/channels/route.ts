import { NextResponse } from "next/server";

// ============================================================
// LIVE CHANNELS API — REMOVED DaddyLive/dlhd.pk
// DaddyLive has been removed. TV channels are now served by
// /api/live-tv/channels (DamiTV + StreamFree only).
// This route returns empty to avoid breaking any references.
// ============================================================

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json([]);
}
