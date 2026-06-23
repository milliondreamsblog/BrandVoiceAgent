// Read-only audit of the /train calibration deck. Answers the two questions
// Divij keeps pressing on:
//   1. Is there enough volume per bucket to fill a ~50-card "this or that" deck?
//   2. Is there real CONTRAST in each pair (extremes), so taste is actually
//      captured — not two near-identical lines?
//
// Pure SELECTs — never mutates. Run with: npm run db:audit:pairs
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env.local");
const sql = neon(url);

// Cheap contrast proxies (no model call): how different are the two sides?
//   • lenΔ  — absolute char-length gap (length/rhythm axes)
//   • firstWordDiff — do they open on different words? (hook/opener axes)
//   • jaccard — word-set overlap; low overlap ⇒ genuinely different phrasing
function words(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean)
  );
}
function jaccard(a: string, b: string): number {
  const A = words(a), B = words(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
function firstWord(s: string): string {
  return (s.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

async function main() {
  const pairs = (await sql`
    SELECT id, pillar, axis, left_text, right_text, left_meta, right_meta, source
    FROM taste_pairs ORDER BY pillar, axis, created_at`) as any[];

  const choices = (await sql`
    SELECT pillar, count(*)::int c FROM taste_choices GROUP BY pillar`) as any[];
  const chosenByPillar: Record<string, number> = {};
  for (const r of choices) chosenByPillar[r.pillar] = r.c;

  const exBySource = (await sql`
    SELECT source, count(*)::int c FROM taste_examples GROUP BY source ORDER BY source`) as any[];

  console.log("\n══════════ /train deck audit ══════════\n");
  console.log(`Total taste_pairs: ${pairs.length}`);
  console.log("taste_examples by source:",
    exBySource.map((r) => `${r.source}=${r.c}`).join("  ") || "(none)");
  console.log("");

  const byPillar: Record<string, any[]> = {};
  for (const p of pairs) (byPillar[p.pillar] ??= []).push(p);

  for (const pillar of Object.keys(byPillar)) {
    const list = byPillar[pillar];
    const chosen = chosenByPillar[pillar] ?? 0;
    const remaining = list.length - chosen; // rough: choices may target other axes, but single-reviewer ⇒ ≈ drained
    // Per-axis counts
    const axisCounts: Record<string, number> = {};
    for (const p of list) axisCounts[p.axis] = (axisCounts[p.axis] ?? 0) + 1;

    // Contrast stats
    const jac = list.map((p) => jaccard(p.left_text, p.right_text));
    const lenDelta = list.map((p) => Math.abs(p.left_text.length - p.right_text.length));
    const diffOpen = list.filter((p) => firstWord(p.left_text) !== firstWord(p.right_text)).length;
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const lowContrast = list.filter((p, i) => jac[i] > 0.6); // >60% word overlap ⇒ weak contrast

    console.log(`── ${pillar.toUpperCase()} ──`);
    console.log(`   pairs: ${list.length}   (deck toward 50: ${list.length >= 50 ? "OK" : "SHORT by " + (50 - list.length)})`);
    console.log(`   chosen so far: ${chosen}   approx remaining in deck: ${Math.max(0, remaining)}`);
    console.log(`   axes: ${Object.entries(axisCounts).map(([a, c]) => `${a}=${c}`).join("  ")}`);
    console.log(`   contrast: avg word-overlap=${avg(jac).toFixed(2)} (lower=more contrast)  ` +
      `avg lenΔ=${Math.round(avg(lenDelta))}ch  diff-opening=${diffOpen}/${list.length}`);
    if (lowContrast.length) {
      console.log(`   ⚠ ${lowContrast.length} LOW-CONTRAST pair(s) (>0.6 overlap) — Divij wants extremes:`);
      for (const p of lowContrast.slice(0, 3)) {
        console.log(`      • [${p.axis}] L: ${JSON.stringify(p.left_text.slice(0, 70))}`);
        console.log(`              R: ${JSON.stringify(p.right_text.slice(0, 70))}`);
      }
    }
    // One sample so we can eyeball the writing quality
    const s = list[0];
    if (s) {
      console.log(`   sample [${s.axis}] (${s.left_meta} vs ${s.right_meta}):`);
      console.log(`      L: ${JSON.stringify(s.left_text.slice(0, 90))}`);
      console.log(`      R: ${JSON.stringify(s.right_text.slice(0, 90))}`);
    }
    console.log("");
  }

  console.log("═══════════════════════════════════════\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
