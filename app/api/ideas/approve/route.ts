// POST /api/ideas/approve — approve or reject a seed (optionally editing it first).
//   body: { ideaId, action: 'approve' | 'reject', editedAngle?, editedBucket? }
//
// Queue-only: this NEVER spends a model call. Approving just flips status; drafting
// (the Opus spend) is a separate step in /api/ideas/draft.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { isPillar } from "@/lib/pillars";

export async function POST(req: NextRequest) {
  try {
    const { ideaId, action, editedAngle, editedBucket } = await req.json();
    if (!ideaId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "ideaId and action ('approve' | 'reject') are required" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {
      status: action === "approve" ? "approved" : "rejected",
    };
    if (typeof editedAngle === "string" && editedAngle.trim()) {
      update.angle = editedAngle.trim();
    }
    if (editedBucket && isPillar(editedBucket)) {
      update.bucket = editedBucket;
    }

    const [row] = await db
      .update(ideas)
      .set(update)
      .where(eq(ideas.id, ideaId))
      .returning();

    if (!row) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 });
    }
    return NextResponse.json({ idea: row });
  } catch (e) {
    console.error("POST /api/ideas/approve failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
