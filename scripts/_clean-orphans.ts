// THROWAWAY one-off: sweeps e2e test residue orphaned by a killed test run.
// e2e posts always have body starting `e2e-<timestamp>` (see scripts/e2e.ts:111),
// so `body LIKE 'e2e-%'` can never match real content.
// Inspect:  npx tsx scripts/_clean-orphans.ts
// Apply:    npx tsx scripts/_clean-orphans.ts --apply
// Delete this file after use — do NOT commit.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import fs from "fs";
import { neon } from "@neondatabase/serverless";

const env = fs.readFileSync(".env.local", "utf8");
const dbUrl = env.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1].trim();
if (!dbUrl) throw new Error("DATABASE_URL not found");
const sql = neon(dbUrl);
const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const APPLY = process.argv.includes("--apply");

async function main() {
  const posts = (await sql`
    SELECT id, pillar, status, batch_id, left(body, 70) AS body
    FROM posts WHERE body LIKE 'e2e-%' ORDER BY created_at`) as any[];
  console.log(`\nOrphan e2e posts: ${posts.length}`);
  for (const p of posts) console.log(`  ${p.id} [${p.status}/${p.pillar}] ${p.body}`);

  const te = Number((await sql`SELECT count(*)::int c FROM taste_examples
    WHERE approved_text LIKE 'e2e-%' OR COALESCE(original,'') LIKE 'e2e-%' OR COALESCE(edit_notes,'') LIKE '%e2e-%'`)[0].c);
  const tp = Number((await sql`SELECT count(*)::int c FROM taste_pairs
    WHERE source='e2e' OR left_text LIKE 'e2e-%' OR right_text LIKE 'e2e-%'`)[0].c);
  const tc = Number((await sql`SELECT count(*)::int c FROM taste_choices
    WHERE COALESCE(chosen_text,'') LIKE 'e2e-%' OR COALESCE(edited_text,'') LIKE 'e2e-%'`)[0].c);
  console.log(`Train residue → taste_examples=${te} taste_pairs=${tp} taste_choices=${tc}`);

  const totalPosts = Number((await sql`SELECT count(*)::int c FROM posts`)[0].c);
  console.log(`Total posts in DB: ${totalPosts}  (real = ${totalPosts - posts.length})`);

  if (!APPLY) { console.log("\n(dry run — re-run with --apply to delete)\n"); return; }

  const batchIds = new Set(posts.map((p) => p.batch_id).filter(Boolean));
  for (const p of posts) {
    const res = await fetch(`${BASE}/api/posts?id=${p.id}`, { method: "DELETE" });
    console.log(`  DELETE post ${p.id} → ${res.status}`);
  }
  await sql`DELETE FROM taste_examples
    WHERE approved_text LIKE 'e2e-%' OR COALESCE(original,'') LIKE 'e2e-%' OR COALESCE(edit_notes,'') LIKE '%e2e-%'`;
  await sql`DELETE FROM taste_pairs WHERE source='e2e' OR left_text LIKE 'e2e-%' OR right_text LIKE 'e2e-%'`;
  for (const b of batchIds) {
    const left = Number((await sql`SELECT count(*)::int c FROM posts WHERE batch_id=${b}`)[0].c);
    if (left === 0) { await sql`DELETE FROM batches WHERE id=${b}`; console.log(`  DELETE empty batch ${b}`); }
  }

  const after = Number((await sql`SELECT count(*)::int c FROM posts WHERE body LIKE 'e2e-%'`)[0].c);
  const afterTotal = Number((await sql`SELECT count(*)::int c FROM posts`)[0].c);
  console.log(`\nAfter: ${afterTotal} posts total, ${after} e2e orphans remaining.\n`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
