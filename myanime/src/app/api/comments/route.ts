import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const animeId = searchParams.get("animeId");
    const episode = searchParams.get("episode");
    const sort = searchParams.get("sort") || "newest";

    if (!animeId) {
      return NextResponse.json({ error: "animeId required" }, { status: 400 });
    }

    const where: Record<string, unknown> = { animeId, parentId: null };
    if (episode) where.episode = parseFloat(episode);

    const orderBy: Record<string, string> =
      sort === "oldest" ? { createdAt: "asc" } :
      sort === "top" ? { likes: "desc" } :
      { createdAt: "desc" };

    const comments = await db.comment.findMany({
      where,
      orderBy,
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Get aggregate rating stats
    const allRatings = await db.comment.findMany({
      where: { animeId, rating: { not: null } },
      select: { rating: true },
    });

    const ratingCount = allRatings.length;
    const ratingAvg = ratingCount > 0
      ? allRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingCount
      : 0;

    // Rating distribution
    const distribution = [1, 2, 3, 4, 5].map(star => ({
      star,
      count: allRatings.filter(r => r.rating === star).length,
    }));

    return NextResponse.json({
      comments,
      stats: { ratingAvg: Math.round(ratingAvg * 10) / 10, ratingCount, distribution },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch comments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { animeId, episode, username, content, parentId, rating } = body;

    if (!animeId || !username || !content) {
      return NextResponse.json({ error: "animeId, username, content required" }, { status: 400 });
    }

    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: { animeId, episode, username, content, parentId, rating: rating || null },
      include: { replies: true },
    });

    return NextResponse.json(comment);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { commentId, action, userId } = body;

    if (!commentId || !action) {
      return NextResponse.json({ error: "commentId and action required" }, { status: 400 });
    }

    if (action === "like") {
      if (!userId) return NextResponse.json({ error: "userId required for like" }, { status: 400 });

      const existing = await db.commentLike.findUnique({
        where: { commentId_userId: { commentId, userId } },
      });

      if (existing) {
        // Unlike
        await db.commentLike.delete({ where: { id: existing.id } });
        const comment = await db.comment.update({
          where: { id: commentId },
          data: { likes: { decrement: 1 } },
        });
        return NextResponse.json({ ...comment, liked: false });
      } else {
        // Like
        await db.commentLike.create({ data: { commentId, userId } });
        const comment = await db.comment.update({
          where: { id: commentId },
          data: { likes: { increment: 1 } },
        });
        return NextResponse.json({ ...comment, liked: true });
      }
    }

    if (action === "delete") {
      // Delete comment and its replies
      await db.commentLike.deleteMany({ where: { commentId } });
      await db.comment.deleteMany({ where: { parentId: commentId } });
      await db.comment.delete({ where: { id: commentId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
