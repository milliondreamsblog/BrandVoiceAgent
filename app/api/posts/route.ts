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
  rewrites as rewritesTable,
  tasteExamples,
  type MediaItem,
} from "@/lib/db/schema";
import { generateRewrites } from "@/lib/generateRewrites";
import { coercePillar, isPillar } from "@/lib/pillars";

const PAGE_SIZE = 10;

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

    // Generate rewrites for every post in parallel (writer can wait a few
    // seconds; Divij's review page stays instant because they're pre-computed).
    await Promise.all(
      insertedPosts.map(async (post) => {
        try {
          const mediaNote = describeMedia(post.media as MediaItem[]);
          const gen = await generateRewrites(post.body, mediaNote, post.pillar);

          // Defensive: the model can occasionally emit an empty or duplicate-label
          // entry. Keep only non-empty rewrites, one per label, so Divij's queue
          // never shows a blank card.
          const seen = new Set<string>();
          const clean = gen.rewrites.filter((r) => {
            if (!r.text?.trim() || !["A", "B", "C"].includes(r.label)) return false;
            if (seen.has(r.label)) return false;
            seen.add(r.label);
            return true;
          });
          if (!clean.length) throw new Error("No usable rewrites returned.");

          // Make sure exactly one survives as recommended even if the model's
          // pick got filtered out — fall back to the highest publish score.
          let rec = gen.recommended;
          if (!clean.some((r) => r.label === rec)) {
            rec = clean.reduce((a, b) => (b.publish_score > a.publish_score ? b : a)).label;
          }

          await db.insert(rewritesTable).values(
            clean.map((r) => ({
              postId: post.id,
              label: r.label,
              text: r.text,
              rationale: r.rationale,
              publishScore: r.publish_score,
              recommended: r.label === rec,
            }))
          );
        } catch (e) {
          console.error(`Generation failed for post ${post.id}:`, e);
          // Leave the post with zero rewrites; the review UI shows a retry.
        }
      })
    );

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

function describeMedia(media: MediaItem[]): string | undefined {
  if (!media?.length) return undefined;
  const imgs = media.filter((m) => m.type === "image").length;
  const vids = media.filter((m) => m.type === "video").length;
  const parts: string[] = [];
  if (imgs) parts.push(`${imgs} image${imgs > 1 ? "s" : ""}`);
  if (vids) parts.push(`${vids} video${vids > 1 ? "s" : ""}`);
  return parts.join(" and ");
}
