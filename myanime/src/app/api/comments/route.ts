import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get("animeId");
    const episode = searchParams.get("episode");

    if (!animeId) {
      return NextResponse.json({ error: "animeId required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { animeId };
    if (episode) where.episode = parseFloat(episode);

    const comments = await db.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(comments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animeId, episode, username, content, parentId } = body;

    if (!animeId || !username || !content) {
      return NextResponse.json({ error: "animeId, username, content required" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: { animeId, episode, username, content, parentId },
    });
    return NextResponse.json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
