// Shared "generate 3 rewrites and persist them" step. Extracted from
// app/api/posts/route.ts so both the writer's submit path (/api/posts) and the
// ideation draft path (/api/ideas/draft) run the EXACT same generation + cleanup +
// recommended-fallback logic. Throws on failure; callers swallow per-item so one
// bad post doesn't fail the whole batch.

import { db } from "./db";
import { rewrites as rewritesTable, type MediaItem } from "./db/schema";
import { generateRewrites } from "./generateRewrites";
import type { Pillar } from "./pillars";

type GeneratablePost = {
  id: string;
  body: string;
  media: MediaItem[];
  pillar: Pillar;
};

export async function generateAndPersist(post: GeneratablePost): Promise<void> {
  const mediaNote = describeMedia(post.media);
  const gen = await generateRewrites(post.body, mediaNote, post.pillar);

  // Defensive: the model can occasionally emit an empty or duplicate-label entry.
  // Keep only non-empty rewrites, one per label, so the queue never shows a blank card.
  const seen = new Set<string>();
  const clean = gen.rewrites.filter((r) => {
    if (!r.text?.trim() || !["A", "B", "C"].includes(r.label)) return false;
    if (seen.has(r.label)) return false;
    seen.add(r.label);
    return true;
  });
  if (!clean.length) throw new Error("No usable rewrites returned.");

  // Ensure exactly one survives as recommended even if the model's pick got
  // filtered out — fall back to the highest publish score.
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
}

export function describeMedia(media: MediaItem[]): string | undefined {
  if (!media?.length) return undefined;
  const imgs = media.filter((m) => m.type === "image").length;
  const vids = media.filter((m) => m.type === "video").length;
  const parts: string[] = [];
  if (imgs) parts.push(`${imgs} image${imgs > 1 ? "s" : ""}`);
  if (vids) parts.push(`${vids} video${vids > 1 ? "s" : ""}`);
  return parts.join(" and ");
}
