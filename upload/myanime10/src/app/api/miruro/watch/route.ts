import { NextRequest, NextResponse } from "next/server";
import { miruroWatch } from "@/lib/miruro-api";

export async function GET(req: NextRequest) {
  const provider = req.nextUrl.searchParams.get("provider") || "kiwi";
  const id = parseInt(req.nextUrl.searchParams.get("id") || "0");
  const translationType = (req.nextUrl.searchParams.get("type") || "sub") as "sub" | "dub";
  const slug = req.nextUrl.searchParams.get("slug") || "1";

  if (!id) {
    return NextResponse.json({ success: false, error: "Parameter 'id' (AniList ID) is required" }, { status: 400 });
  }

  try {
    const data = await miruroWatch(provider, id, translationType, slug);
    if (!data) {
      return NextResponse.json({ success: false, error: "No stream found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
