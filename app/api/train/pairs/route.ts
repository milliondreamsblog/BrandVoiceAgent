// GET /api/train/pairs?bucket=design — the calibration deck for one pillar.
// Returns this bucket's contrast pairs that Divij hasn't chosen on yet, oldest
// first. Single reviewer, so "already chosen" is global (any taste_choices row
// for the pair), which lets the deck drain over repeated sessions toward 50 picks.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tastePairs, tasteChoices } from "@/lib/db/schema";
import { isPillar } from "@/lib/pillars";

export async function GET(req: NextRequest) {
  try {
    const bucket = req.nextUrl.searchParams.get("bucket");
    if (!isPillar(bucket)) {
      return NextResponse.json(
        { error: "a valid bucket (design | company | experiment) is required" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(tastePairs)
      .where(eq(tastePairs.pillar, bucket))
      .orderBy(asc(tastePairs.createdAt));

    const chosenRows = await db
      .selectDistinct({ pairId: tasteChoices.pairId })
      .from(tasteChoices)
      .where(eq(tasteChoices.pillar, bucket));
    const chosen = new Set(chosenRows.map((c) => c.pairId));

    const pairs = rows
      .filter((r) => !chosen.has(r.id))
      .map((r) => ({
        id: r.id,
        axis: r.axis,
        leftText: r.leftText,
        rightText: r.rightText,
        leftMeta: r.leftMeta,
        rightMeta: r.rightMeta,
      }));

    return NextResponse.json({
      pillar: bucket,
      total: rows.length,
      remaining: pairs.length,
      pairs,
    });
  } catch (e) {
    console.error("GET /api/train/pairs failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
