// POST /api/train/choice — record one this-or-that calibration pick.
//   body: { pairId, chosen: 'left'|'right'|'neither', strength?, reasonChip?, note?, sessionId? }
//
// Every pick is logged to taste_choices. A real pick (not "neither") is also
// promoted into taste_examples as source='game', so bucket-first retrieval can
// surface Divij's preferences at generation time. We store the side he passed
// over as `original` — two on-voice options where one was preferred is a genuine
// before/after preference signal, not just an approval.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tastePairs, tasteChoices, tasteExamples } from "@/lib/db/schema";

type Chosen = "left" | "right" | "neither";
type Body = {
  pairId?: string;
  chosen?: Chosen;
  strength?: string;
  reasonChip?: string;
  note?: string;
  sessionId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { pairId, chosen, strength, reasonChip, note, sessionId } =
      (await req.json()) as Body;

    if (
      !pairId ||
      (chosen !== "left" && chosen !== "right" && chosen !== "neither")
    ) {
      return NextResponse.json(
        { error: "pairId and chosen ∈ {left, right, neither} are required" },
        { status: 400 }
      );
    }

    const [pair] = await db
      .select()
      .from(tastePairs)
      .where(eq(tastePairs.id, pairId));
    if (!pair) {
      return NextResponse.json({ error: "pair not found" }, { status: 404 });
    }

    const chosenText =
      chosen === "left"
        ? pair.leftText
        : chosen === "right"
        ? pair.rightText
        : null;
    const rejectedText =
      chosen === "left"
        ? pair.rightText
        : chosen === "right"
        ? pair.leftText
        : null;

    // Pillar & axis are taken from the pair (authoritative), never the client.
    await db.insert(tasteChoices).values({
      pairId: pair.id,
      pillar: pair.pillar,
      axis: pair.axis,
      chosen,
      chosenText,
      strength: strength?.trim() || null,
      reasonChip: reasonChip?.trim() || null,
      note: note?.trim() || null,
      sessionId: sessionId?.trim() || null,
    });

    let promoted = false;
    if (chosen !== "neither" && chosenText) {
      const parts = [pair.axis, reasonChip, note]
        .map((x) => (x ?? "").toString().trim())
        .filter(Boolean);
      const editNotes = parts.length ? parts.join(" — ") : null;

      await db.insert(tasteExamples).values({
        original: rejectedText, // the option Divij passed over — a real preference contrast
        approvedText: chosenText,
        editNotes,
        pillar: pair.pillar,
        category: null,
        source: "game",
      });
      promoted = true;
    }

    return NextResponse.json({ ok: true, promoted });
  } catch (e) {
    console.error("POST /api/train/choice failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
