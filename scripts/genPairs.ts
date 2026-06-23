// Generate the /train calibration deck: contrastive this-or-that pairs.
// Run with: npm run gen:pairs   (idempotent — clears source='opus-seed' rows first)
//
// Each pair takes ONE underlying idea and writes it two ways, pushed to opposite
// extremes of a SINGLE axis (hook / length / register / claim_density / opener /
// rhythm), scoped to a pillar. Both sides are genuinely on-voice — the only
// difference is the axis. Divij's pick is the training signal; there is no
// "correct" side.
//
// Cost ceiling: PILLARS × AXES Opus calls (18), ~3 pairs each, run once. The
// two sides are modelled as named string fields (left_text/right_text) — NOT an
// items array with length constraints (those are stripped by structured output).

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";
import { tastePairs } from "../lib/db/schema";
import { PILLARS, PILLAR_META, type Pillar } from "../lib/pillars";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL in .env.local");
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error("Set ANTHROPIC_API_KEY in .env.local");

const sql = neon(url);
const db = drizzle(sql);
const anthropic = new Anthropic({ apiKey: apiKey.replace(/^﻿/, "") });

const RULES = fs.readFileSync(
  path.join(process.cwd(), "tone-agent", "voice-critic.system.md"),
  "utf8"
);

// One axis = one dimension of taste, with its two opposite extremes named.
const AXES = [
  { key: "hook", desc: "the shape of the opening line", left: "opens on a bold, declarative claim", right: "opens on an open question or a slow setup" },
  { key: "length", desc: "overall length", left: "terse — one or two tight lines, nothing extra", right: "developed — several short paragraphs that build" },
  { key: "register", desc: "tone register", left: "punchy and casual, close to how you'd say it out loud", right: "measured and composed, more considered" },
  { key: "claim_density", desc: "how concrete it is", left: "anchored on a specific number, name, or example", right: "abstract — the idea stated without a concrete anchor" },
  { key: "opener", desc: "the entry point", left: "cold-opens straight into the moment", right: "context-first — frames the situation, then lands the point" },
  { key: "rhythm", desc: "line rhythm", left: "line-break-heavy, one thought per line", right: "flowing — sentences run together as prose" },
] as const;

// A few grounded topics per pillar so the model writes real Bricx posts, not
// generic filler. These are starting points; the model varies them per pair.
const SEEDS: Record<Pillar, string[]> = {
  design: [
    "strong design opinions online vs an actual shipped portfolio",
    "a small craft detail in a UI that most people walk past",
    "what separates designers who ship inside real constraints from ones who only post",
  ],
  company: [
    "an unexpected inbound lead that arrived through a referral you can't trace",
    "hiring for a role because the same client request kept coming back",
    "an honest update about the team outgrowing its own processes",
  ],
  experiment: [
    "a what-if about collapsing onboarding into a single screen",
    "a small experiment that changed how the team thinks about a flow",
    "a contrarian test you ran and what it actually showed",
  ],
};

const PAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pairs"],
  properties: {
    pairs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["left_text", "right_text", "left_meta", "right_meta"],
        properties: {
          left_text: { type: "string" },
          right_text: { type: "string" },
          left_meta: { type: "string" },
          right_meta: { type: "string" },
        },
      },
    },
  },
} as const;

type Pair = {
  left_text: string;
  right_text: string;
  left_meta: string;
  right_meta: string;
};

const PER_CALL = 3;

async function genFor(pillar: Pillar, axis: (typeof AXES)[number]): Promise<Pair[]> {
  const hint = PILLAR_META[pillar].hint || "a normal post — just Divij's voice, no special steer";
  const system = `${RULES}

---

# Your job right now

You are generating CONTRAST PAIRS to calibrate one reviewer's taste. Each pair is the SAME underlying idea written two ways, pushed to opposite extremes of ONE axis. Both versions must be genuinely publishable in this voice — neither is a strawman. There is no "correct" side; the contrast is the point. Never label which is better.`;

  const user = `Write ${PER_CALL} contrast pairs for the "${pillar}" pillar (${PILLAR_META[pillar].label}).
Pillar context: ${hint}

Axis to contrast: ${axis.key} — ${axis.desc}.
  • LEFT side: ${axis.left}.
  • RIGHT side: ${axis.right}.

Rules for every pair:
- LEFT and RIGHT are the SAME post idea — only the ${axis.key} axis differs, pushed to its two opposite extremes. A reader should feel they're choosing a flavor of the same tweet, not two unrelated tweets.
- Both sides fully on-voice (obey the rules above). No rule violations on either side.
- Each pair uses a DIFFERENT topic. Draw from, but don't copy: ${SEEDS[pillar].join("; ")}.
- Real, specific, concrete — no placeholder names or lorem.
- left_meta / right_meta: a 2-4 word tag naming this side's extreme (e.g. "${axis.left.split(" — ")[0]}").

Return ${PER_CALL} pairs.`;

  const params = {
    model: "claude-opus-4-8",
    max_tokens: 6000,
    system,
    messages: [{ role: "user", content: user }],
    output_config: { format: { type: "json_schema", schema: PAIR_SCHEMA } },
  };

  const res: any = await anthropic.messages.create(params as any);
  const text: string = (res?.content ?? []).find((b: any) => b?.type === "text")?.text ?? "";
  if (!text) throw new Error("empty response");
  const parsed = JSON.parse(text) as { pairs?: Pair[] };
  return parsed.pairs ?? [];
}

async function main() {
  const inserts: (typeof tastePairs.$inferInsert)[] = [];
  const seen = new Set<string>();
  let calls = 0;
  const cap = PILLARS.length * AXES.length; // hard ceiling — 18 Opus calls

  for (const pillar of PILLARS) {
    for (const axis of AXES) {
      if (calls >= cap) break;
      calls++;
      let pairs: Pair[] = [];
      try {
        pairs = await genFor(pillar, axis);
      } catch (e) {
        console.error(`  ✗ ${pillar}/${axis.key}: ${String(e)}`);
        continue;
      }
      let kept = 0;
      for (const p of pairs) {
        const lt = (p.left_text ?? "").trim();
        const rt = (p.right_text ?? "").trim();
        if (!lt || !rt || lt === rt) continue; // a pair with equal sides is noise
        const key = `${pillar}|${axis.key}|${lt.slice(0, 48)}|${rt.slice(0, 48)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        inserts.push({
          pillar,
          axis: axis.key,
          leftText: lt,
          rightText: rt,
          leftMeta: (p.left_meta ?? "").trim() || axis.left,
          rightMeta: (p.right_meta ?? "").trim() || axis.right,
          source: "opus-seed",
        });
        kept++;
      }
      console.log(`  ✓ ${pillar}/${axis.key}: kept ${kept}/${pairs.length}`);
    }
  }

  await db.delete(tastePairs).where(eq(tastePairs.source, "opus-seed"));
  if (inserts.length) await db.insert(tastePairs).values(inserts);
  console.log(
    `\nInserted ${inserts.length} taste_pairs (${PILLARS.length} pillars × ${AXES.length} axes, ${calls} Opus calls).`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
