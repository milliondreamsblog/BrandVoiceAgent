// POST /api/reactions — record every Divij signal.
//   like / disapprove : toggle, mutually exclusive per rewrite
//   comment           : append (payload = comment text)
//   edit              : replace Divij's hand-edit for that rewrite (payload = text)
//   pick              : terminal — mark post reviewed + promote to taste_examples
//
// Single reviewer (Divij) assumed, so toggles are global per rewrite.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  posts,
  rewrites as rewritesTable,
  reactions,
  tasteExamples,
} from "@/lib/db/schema";

type ReactionType = "like" | "pick" | "edit" | "comment" | "disapprove";
type Body = {
  postId: string;
  rewriteId?: string;
  type: ReactionType;
  payload?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { postId, rewriteId, type, payload } = (await req.json()) as Body;
    if (!postId || !type) {
      return NextResponse.json(
        { error: "postId and type are required" },
        { status: 400 }
      );
    }

    // ── like / disapprove: mutually exclusive toggle ──
    if (type === "like" || type === "disapprove") {
      if (!rewriteId) {
        return NextResponse.json({ error: "rewriteId required" }, { status: 400 });
      }
      const opposite = type === "like" ? "disapprove" : "like";
      await db
        .delete(reactions)
        .where(
          and(eq(reactions.rewriteId, rewriteId), eq(reactions.type, opposite))
        );

      const existing = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.rewriteId, rewriteId), eq(reactions.type, type)));

      if (existing.length) {
        await db
          .delete(reactions)
          .where(and(eq(reactions.rewriteId, rewriteId), eq(reactions.type, type)));
        return NextResponse.json({ ok: true, active: false });
      }
      await db.insert(reactions).values({ postId, rewriteId, type });
      return NextResponse.json({ ok: true, active: true });
    }

    // ── edit: one hand-edit per rewrite, replace on re-save ──
    if (type === "edit") {
      if (!rewriteId || !payload?.trim()) {
        return NextResponse.json(
          { error: "rewriteId and payload required" },
          { status: 400 }
        );
      }
      await db
        .delete(reactions)
        .where(and(eq(reactions.rewriteId, rewriteId), eq(reactions.type, "edit")));
      await db
        .insert(reactions)
        .values({ postId, rewriteId, type: "edit", payload });
      return NextResponse.json({ ok: true });
    }

    // ── comment: append ──
    if (type === "comment") {
      if (!payload?.trim()) {
        return NextResponse.json({ error: "payload required" }, { status: 400 });
      }
      await db
        .insert(reactions)
        .values({ postId, rewriteId: rewriteId ?? null, type: "comment", payload });
      return NextResponse.json({ ok: true });
    }

    // ── pick: terminal. Mark reviewed, flag the winner, feed the flywheel ──
    if (type === "pick") {
      if (!rewriteId) {
        return NextResponse.json({ error: "rewriteId required" }, { status: 400 });
      }
      await db.insert(reactions).values({ postId, rewriteId, type: "pick" });
      await db.update(posts).set({ status: "reviewed" }).where(eq(posts.id, postId));
      await db
        .update(rewritesTable)
        .set({ recommended: false })
        .where(eq(rewritesTable.postId, postId));
      await db
        .update(rewritesTable)
        .set({ recommended: true })
        .where(eq(rewritesTable.id, rewriteId));

      // Promote to taste_examples so the next critique is better-anchored.
      const [post] = await db.select().from(posts).where(eq(posts.id, postId));
      const [rw] = await db
        .select()
        .from(rewritesTable)
        .where(eq(rewritesTable.id, rewriteId));
      const editRows = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.rewriteId, rewriteId), eq(reactions.type, "edit")));
      const commentRows = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.type, "comment")));

      const approvedText = editRows[0]?.payload ?? rw?.text ?? "";
      const notes =
        commentRows
          .map((c) => c.payload)
          .filter(Boolean)
          .join(" | ") || null;

      if (approvedText) {
        await db.insert(tasteExamples).values({
          original: post?.body ?? null,
          approvedText,
          editNotes: notes,
          // Tag the bucket so bucket-first retrieval can surface this pick. Without
          // this, /review picks would land bucket-less and never feed their pillar.
          pillar: post?.pillar ?? null,
          source: "flywheel",
          sourcePostId: postId, // so deleting the draft also untrains this example
        });
      }
      return NextResponse.json({ ok: true, picked: true });
    }

    return NextResponse.json({ error: "unknown reaction type" }, { status: 400 });
  } catch (e) {
    console.error("POST /api/reactions failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
