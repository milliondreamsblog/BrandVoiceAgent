// Additive, idempotent migration for the /train calibration feature.
// Run with: npm run db:migrate:train
//
// This is a deliberate alternative to `drizzle-kit push` on the prod-shared Neon
// DB: the SQL is explicit and reviewable, every statement is additive and guarded
// with IF NOT EXISTS, so it can run non-interactively and re-run safely. It
// mirrors lib/db/schema.ts exactly, so a later `drizzle-kit push` sees no diff.
//
// Changes (all additive — zero ALTER/DROP on existing columns):
//   • taste_examples.pillar  — new nullable column
//   • taste_pairs            — new table (+ pillar/axis index)
//   • taste_choices          — new table (FK → taste_pairs, ON DELETE CASCADE)

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env.local");
const sql = neon(url);

async function main() {
  console.log("→ taste_examples.pillar (nullable text)…");
  await sql`ALTER TABLE taste_examples ADD COLUMN IF NOT EXISTS pillar text`;

  console.log("→ taste_pairs…");
  await sql`
    CREATE TABLE IF NOT EXISTS taste_pairs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pillar text NOT NULL,
      axis text NOT NULL,
      left_text text NOT NULL,
      right_text text NOT NULL,
      left_meta text,
      right_meta text,
      source text NOT NULL DEFAULT 'opus-seed',
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE INDEX IF NOT EXISTS taste_pairs_pillar_axis_idx
      ON taste_pairs (pillar, axis)`;

  console.log("→ taste_choices…");
  await sql`
    CREATE TABLE IF NOT EXISTS taste_choices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pair_id uuid NOT NULL REFERENCES taste_pairs(id) ON DELETE CASCADE,
      pillar text NOT NULL,
      axis text NOT NULL,
      chosen text NOT NULL,
      chosen_text text,
      strength text,
      reason_chip text,
      note text,
      session_id uuid,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;

  // Prove the shape landed.
  const cols = (await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name='taste_examples' AND column_name='pillar'`) as unknown[];
  const tables = (await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_name IN ('taste_pairs','taste_choices')
    ORDER BY table_name`) as { table_name: string }[];

  console.log(
    `✅ migrate-train complete. taste_examples.pillar present: ${cols.length === 1}; tables: ${tables
      .map((t) => t.table_name)
      .join(", ")}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
