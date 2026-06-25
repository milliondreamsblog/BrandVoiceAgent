// GET /api/ideas — the ideation queue: seeds still pending + approved-but-not-yet
// drafted (post_id null). Ordered best-first (confidence desc) for the /ideas page.

export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(ideas)
      .where(
        or(
          eq(ideas.status, "pending"),
          and(eq(ideas.status, "approved"), isNull(ideas.postId))
        )
      )
      .orderBy(desc(ideas.confidence), desc(ideas.createdAt));

    return NextResponse.json({ ideas: rows });
  } catch (e) {
    console.error("GET /api/ideas failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
