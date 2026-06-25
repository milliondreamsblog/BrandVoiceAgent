// POST  /api/posts  -> create a batch of writer drafts, generate 3 rewrites each
// GET   /api/posts?page=1&status=pending -> paginated posts + rewrites + reactions

export const runtime = "nodejs";
export const maxDuration = 300; // generation can be several Opus calls in parallel

import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  batches,
  posts,
  tasteExamples,
  type MediaItem,
} from "@/lib/db/schema";
import { generateAndPersist } from "@/lib/persistRewrites";
import { isConfigured } from "@/lib/anthropic";
import { coercePillar, isPillar } from "@/lib/pillars";

const PAGE_SIZE = 10;
const MAX_BATCH = 20; // bound worst-case spend: one fat submit can't fan out into unbounded Opus calls

type IncomingPost = { body: string; media?: MediaItem[]; pillar?: string };

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const incoming: IncomingPost[] = (json.posts ?? []).filter(
      (p: IncomingPost) => (p.body ?? "").trim() || (p.media ?? []).length
    );
    if (!incoming.length) {
      return NextResponse.json({ error: "No posts provided" }, { status: 400 });
    }
    if (incoming.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Too many posts (${incoming.length}); max ${MAX_BATCH} per submit.` },
        { status: 400 }
      );
    }
    // Fail fast on a missing key — otherwise every per-post call hits the placeholder
    // key, 401s, gets swallowed below, and the writer silently gets a 0-rewrite batch.
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const [batch] = await db
      .insert(batches)
      .values({ author: json.author ?? "writer" })
      .returning();

    // Insert all posts first so the writer's submission is durable even if a
    // generation call hiccups.
    const insertedPosts = await db
      .insert(posts)
      .values(
        incoming.map((p) => ({
          batchId: batch.id,
          body: p.body ?? "",
          media: p.media ?? [],
          pillar: coercePillar(p.pillar),
        }))
      )
      .returning();

    // Generate rewrites. Process the first post alone so its call WRITES the shared
    // voice-rubric cache, then fan the rest out in parallel to READ it. Firing all
    // posts at once (the old behavior) makes each pay the 1.25x cache-write premium
    // because none can read a cache the others are still writing.
    const processPost = async (post: (typeof insertedPosts)[number]) => {
      try {
        await generateAndPersist({
          id: post.id,
          body: post.body,
          media: post.media as MediaItem[],
          pillar: post.pillar,
        });
      } catch (e) {
        console.error(`Generation failed for post ${post.id}:`, e);
        // Leave the post with zero rewrites; the review UI shows a retry.
      }
    };

    const [firstPost, ...restPosts] = insertedPosts;
    if (firstPost) await processPost(firstPost);
    if (restPosts.length) await Promise.all(restPosts.map(processPost));

    return NextResponse.json({ batchId: batch.id, count: insertedPosts.length });
  } catch (e) {
    console.error("POST /api/posts failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const status = url.searchParams.get("status") ?? "pending";
    const pillarParam = url.searchParams.get("pillar");

    // Filter by status always; add the pillar filter only when a valid one is
    // passed (so an omitted/garbage param falls back to "all pillars").
    const where =
      pillarParam && isPillar(pillarParam)
        ? and(eq(posts.status, status), eq(posts.pillar, pillarParam))
        : eq(posts.status, status);
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(posts)
      .where(where);

    const rows = await db.query.posts.findMany({
      where,
      orderBy: [desc(posts.createdAt)],
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: {
        rewrites: true,
        reactions: true,
      },
    });

    return NextResponse.json({
      posts: rows,
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (e) {
    console.error("GET /api/posts failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/posts?id=<postId> — hard-delete a draft and everything tied to it.
// We never keep deleted drafts as training data: the explicit taste_examples
// delete (plus the FK cascade) removes any flywheel example promoted from it,
// and the cascade also clears its rewrites and reactions. Works for pending and
// reviewed posts alike.
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Untrain first: drop any flywheel taste example sourced from this post.
    // (The FK cascade would do this too; we do it explicitly so the guarantee
    // holds even if the constraint is ever missing.)
    await db.delete(tasteExamples).where(eq(tasteExamples.sourcePostId, id));

    const deleted = await db
      .delete(posts)
      .where(eq(posts.id, id))
      .returning({ id: posts.id });

    if (!deleted.length) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (e) {
    console.error("DELETE /api/posts failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
