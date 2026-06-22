/**
 * Push a draft (+ 3 rewrite versions) to the Review Queue.
 * Usage: node scripts/push-draft.mjs scripts/tmp-draft.json
 *
 * Expected JSON format:
 * {
 *   "source": "chat",
 *   "original": "the raw draft text",
 *   "versions": [
 *     { "label": "A", "text": "...", "rationale": "why this version" },
 *     { "label": "B", "text": "...", "rationale": "why this version" },
 *     { "label": "C", "text": "...", "rationale": "why this version" }
 *   ]
 * }
 */

import { readFileSync } from "fs";

const file = process.argv[2];

if (!file) {
  console.error("Usage: node scripts/push-draft.mjs <path-to-draft.json>");
  process.exit(1);
}

const payload = JSON.parse(readFileSync(file, "utf8"));

const res = await fetch("http://localhost:3000/api/drafts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ source: "chat", ...payload }),
  // dev server must be running — it handles the blob token server-side
});

if (!res.ok) {
  console.error("Failed:", await res.text());
  process.exit(1);
}

const { id } = await res.json();
console.log(`\n✓ Draft pushed  (id: ${id})`);
console.log(`  → http://localhost:3000/review\n`);
