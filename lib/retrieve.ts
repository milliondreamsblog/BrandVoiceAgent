// Retrieval — the first lever of the Compounding Taste Loop.
// Pulls the most relevant approved examples from taste_examples so the generator
// is anchored to real Divij before/after pairs, not just the static rule list.
//
// Keyword-overlap for now (no embeddings). Upgrade path: add a pgvector column to
// taste_examples and swap the scoring for cosine similarity — same function shape.
//
// Bucket-aware: when a pillar is given, in-bucket examples are preferred and the
// global pool only backfills when the bucket is sparse (fewer than k rows). A
// null pillar (seed rows not yet tagged) acts as a global fallback that belongs
// to every bucket. No pillar passed ⇒ the old behaviour: pure score ranking.

import { db } from "./db";
import { tasteExamples } from "./db/schema";
import type { Pillar } from "./pillars";

const STOP = new Set(
  "the a an and or but to of in on for with at by from is are was were be been being it its this that these those we our you your i me my he his him she her they them their as so if then than just like about into over under not no do does did have has had will would can could should".split(
    /\s+/
  )
);

function tokens(s: string): string[] {
  return (s.toLowerCase().match(/[a-z0-9']+/g) ?? []).filter(
    (t) => t.length > 2 && !STOP.has(t)
  );
}

export type RetrievedExample = {
  original: string | null;
  approvedText: string;
  editNotes: string | null;
  category: string | null;
  pillar: Pillar | null;
};

export async function retrieveExamples(
  draft: string,
  pillar?: Pillar,
  k = 4
): Promise<RetrievedExample[]> {
  const rows = await db.select().from(tasteExamples);
  const q = new Set(tokens(draft));

  const scoreOf = (r: (typeof rows)[number]) => {
    const hay = tokens(`${r.approvedText} ${r.original ?? ""} ${r.category ?? ""}`);
    const seen = new Set<string>();
    let overlap = 0;
    for (const t of hay) {
      if (q.has(t) && !seen.has(t)) {
        overlap++;
        seen.add(t);
      }
    }
    // Nudge toward examples that carry Divij's reasoning — richer calibration.
    return overlap + (r.editNotes ? 0.5 : 0);
  };

  const scored = rows.map((r) => ({ r, score: scoreOf(r) }));
  const byScore = (a: { score: number }, b: { score: number }) => b.score - a.score;

  let ranked: typeof scored;
  if (pillar) {
    // Bucket-first. Take the bucket's own examples by score; only when the bucket
    // is sparse (fewer than k rows) do we backfill — null-pillar globals first,
    // then other pillars. The three tiers are disjoint, so no dedup is needed.
    const inBucket = scored.filter((s) => s.r.pillar === pillar).sort(byScore);
    if (inBucket.length >= k) {
      ranked = inBucket;
    } else {
      const globalNull = scored.filter((s) => s.r.pillar == null).sort(byScore);
      const others = scored
        .filter((s) => s.r.pillar != null && s.r.pillar !== pillar)
        .sort(byScore);
      ranked = [...inBucket, ...globalNull, ...others];
    }
  } else {
    ranked = scored.sort(byScore);
  }

  return ranked.slice(0, k).map((s) => ({
    original: s.r.original,
    approvedText: s.r.approvedText,
    editNotes: s.r.editNotes,
    category: s.r.category,
    pillar: s.r.pillar,
  }));
}
