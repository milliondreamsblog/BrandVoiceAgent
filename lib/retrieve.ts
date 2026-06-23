// Retrieval — the first lever of the Compounding Taste Loop.
// Pulls the most relevant approved examples from taste_examples so the generator
// is anchored to real Divij before/after pairs, not just the static rule list.
//
// Keyword-overlap for now (no embeddings). Upgrade path: add a pgvector column to
// taste_examples and swap the scoring for cosine similarity — same function shape.

import { db } from "./db";
import { tasteExamples } from "./db/schema";

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
};

export async function retrieveExamples(
  draft: string,
  k = 4
): Promise<RetrievedExample[]> {
  const rows = await db.select().from(tasteExamples);
  const q = new Set(tokens(draft));

  const scored = rows.map((r) => {
    const hay = tokens(
      `${r.approvedText} ${r.original ?? ""} ${r.category ?? ""}`
    );
    const seen = new Set<string>();
    let overlap = 0;
    for (const t of hay) {
      if (q.has(t) && !seen.has(t)) {
        overlap++;
        seen.add(t);
      }
    }
    // Nudge toward examples that carry Divij's reasoning — richer calibration.
    const bonus = r.editNotes ? 0.5 : 0;
    return { r, score: overlap + bonus };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => ({
    original: s.r.original,
    approvedText: s.r.approvedText,
    editNotes: s.r.editNotes,
    category: s.r.category,
  }));
}
