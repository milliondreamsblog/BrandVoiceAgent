// Read-only snapshot of taste_pairs → a timestamped JSON file, so a deck
// regeneration (npm run gen:pairs, which deletes+reinserts source='opus-seed')
// is fully reversible. Run with: npm run db:backup:pairs
//
// To restore from a snapshot if a regen goes wrong, see restore-pairs.ts (or
// re-insert the JSON rows by hand) — the snapshot keeps every column incl. id.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env.local");
const sql = neon(url);

async function main() {
  const rows = (await sql`SELECT * FROM taste_pairs ORDER BY created_at`) as any[];
  const dir = path.join(process.cwd(), "scripts", "backups");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `taste_pairs-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf8");

  const byPillar: Record<string, number> = {};
  for (const r of rows) byPillar[r.pillar] = (byPillar[r.pillar] ?? 0) + 1;
  console.log(`Backed up ${rows.length} taste_pairs → ${path.relative(process.cwd(), file)}`);
  console.log("  " + Object.entries(byPillar).map(([p, c]) => `${p}=${c}`).join("  "));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
