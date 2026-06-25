// POST /api/ideas/draft — "send approved ideas for writing". THE Opus-spend step.
//   body: { ideaIds: string[] }  ->  { drafted, postIds }
//
// For each approved + not-yet-drafted idea: insert a batch-less posts row (the
// angle becomes the draft body), run the existing generation pipeline, and link
// post_id back onto the idea. The new posts then flow through the normal /review
// queue. If generation fails for an idea, its orphan post is rolled back so the
// idea stays approved+undrafted (retryable).

export const runtime = "nodejs";
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { ideas, posts } from "@/lib/db/schema";
import { isConfigured } from "@/lib/anthropic";
import { generateAndPersist } from "@/lib/persistRewrites";

const MAX_DRAFT = 20;

export async function POST(req: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const ideaIds: string[] = Array.isArray(body.ideaIds)
      ? body.ideaIds.filter((x: unknown) => typeof x === "string")
      : [];
    if (!ideaIds.length) {
      return NextResponse.json({ error: "ideaIds is required" }, { status: 400 });
    }
    if (ideaIds.length > MAX_DRAFT) {
      return NextResponse.json(
        { error: `Too many ideas (${ideaIds.length}); max ${MAX_DRAFT} per draft.` },
        { status: 400 }
      );
    }

    // Only approved + not-yet-drafted ideas are eligible.
    const eligible = await db
      .select()
      .from(ideas)
      .where(
        and(
          inArray(ideas.id, ideaIds),
          eq(ideas.status, "approved"),
          isNull(ideas.postId)
        )
      );
    if (!eligible.length) {
      return NextResponse.json(
        { error: "No eligible (approved, undrafted) ideas." },
        { status: 400 }
      );
    }

    const draftOne = async (idea: (typeof eligible)[number]): Promise<string> => {
      // Batch-less post → flows through the existing /review pipeline.
      const [post] = await db
        .insert(posts)
        .values({
          batchId: null,
          body: idea.angle,
          pillar: idea.bucket,
          status: "pending",
        })
        .returning();
      try {
        await generateAndPersist({
          id: post.id,
          body: post.body,
          media: [],
          pillar: post.pillar,
        });
      } catch (e) {
        // Roll back the orphan so the idea stays approved+undrafted (retryable).
        await db.delete(posts).where(eq(posts.id, post.id));
        throw e;
      }
      await db.update(ideas).set({ postId: post.id }).where(eq(ideas.id, idea.id));
      return post.id;
    };

    // First writes the shared rubric cache; the rest read it (mirror /api/posts).
    const ids: string[] = [];
    const [firstIdea, ...restIdeas] = eligible;
    try {
      ids.push(await draftOne(firstIdea));
    } catch (e) {
      console.error(`Draft failed for idea ${firstIdea.id}:`, e);
    }
    const restIds = await Promise.all(
      restIdeas.map(async (i) => {
        try {
          return await draftOne(i);
        } catch (e) {
          console.error(`Draft failed for idea ${i.id}:`, e);
          return null;
        }
      })
    );
    ids.push(...restIds.filter((x): x is string => Boolean(x)));

    return NextResponse.json({ drafted: ids.length, postIds: ids });
  } catch (e) {
    console.error("POST /api/ideas/draft failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
