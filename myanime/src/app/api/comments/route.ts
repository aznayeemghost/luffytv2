import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/comments?animeId=xxx&episode=1
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
      include: { likesList: true },
    });

    // Calculate stats
    const ratings = comments.filter(c => c.rating != null).map(c => c.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    return NextResponse.json({
      comments,
      stats: {
        total: comments.length,
        avgRating: Math.round(avgRating * 10) / 10,
        ratingCount: ratings.length,
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/comments — create comment or like/delete
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, animeId, episode, username, content, parentId, rating, commentId, sessionId } = body;

    // LIKE action
    if (action === "like" && commentId && sessionId) {
      const existing = await db.commentLike.findUnique({
        where: { commentId_sessionId: { commentId, sessionId } }
      });
      if (existing) {
        // Unlike
        await db.commentLike.delete({ where: { id: existing.id } });
        await db.comment.update({
          where: { id: commentId },
          data: { likes: { decrement: 1 } }
        });
        return NextResponse.json({ liked: false });
      } else {
        // Like
        await db.commentLike.create({ data: { commentId, sessionId } });
        await db.comment.update({
          where: { id: commentId },
          data: { likes: { increment: 1 } }
        });
        return NextResponse.json({ liked: true });
      }
    }

    // DELETE action
    if (action === "delete" && commentId) {
      await db.comment.delete({ where: { id: commentId } });
      return NextResponse.json({ success: true });
    }

    // CREATE comment
    if (!animeId || !username || !content) {
      return NextResponse.json({ error: "animeId, username, content required" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: { animeId, episode, username, content, parentId, rating },
    });
    return NextResponse.json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to process request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
