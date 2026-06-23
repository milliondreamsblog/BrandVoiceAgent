// Seed taste_examples from tone-agent/examples.json.
// Run with: npm run db:seed   (idempotent — clears source='seed' rows first)
//
// Mapping:
//   - entries with divij_version  -> original = the option(s), approved = divij_version,
//                                     editNotes = divij_edit_notes   (before/after gold)
//   - approved entries (no divij) -> approved = the chosen option; losers (if any) -> original
//   - everything else (not_approved with no divij rewrite) is skipped — not an anchor.

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { tasteExamples } from "../lib/db/schema";

type Option = { label: string | null; text: string };
type Example = {
  id: string;
  category: string;
  status: string;
  approved_option?: string | null;
  options: Option[];
  media_note?: string | null;
  divij_version?: string;
  divij_edit_notes?: string;
};

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env.local");

const sql = neon(url);
const db = drizzle(sql);

async function main() {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "tone-agent", "examples.json"),
    "utf8"
  );
  const data = JSON.parse(raw) as { examples: Example[] };

  const rows: (typeof tasteExamples.$inferInsert)[] = [];

  for (const ex of data.examples) {
    if (ex.divij_version) {
      rows.push({
        original: ex.options.map((o) => o.text).join("\n---\n"),
        approvedText: ex.divij_version,
        editNotes: ex.divij_edit_notes ?? null,
        category: ex.category,
        source: "seed",
      });
    } else if (ex.status === "approved") {
      const opt = ex.approved_option
        ? ex.options.find((o) => o.label === ex.approved_option) ?? ex.options[0]
        : ex.options[0];
      if (!opt) continue;
      const losers =
        ex.approved_option && ex.options.length > 1
          ? ex.options
              .filter((o) => o.label !== ex.approved_option)
              .map((o) => o.text)
              .join("\n---\n")
          : null;
      rows.push({
        original: losers,
        approvedText: opt.text,
        editNotes:
          ex.media_note && ex.media_note.includes("APPROVED over")
            ? ex.media_note
            : null,
        category: ex.category,
        source: "seed",
      });
    }
  }

  await db.delete(tasteExamples).where(eq(tasteExamples.source, "seed"));
  if (rows.length) await db.insert(tasteExamples).values(rows);
  console.log(`Seeded ${rows.length} taste_examples (source=seed).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
