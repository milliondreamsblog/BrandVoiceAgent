// Generate the /train calibration deck: contrastive this-or-that pairs.
// Run with: npm run gen:pairs   (idempotent — clears source='opus-seed' rows first)
//
// Each pair takes ONE underlying idea and writes it two ways, pushed to opposite
// EXTREMES of a SINGLE axis (hook / length / register / claim_density / opener /
// rhythm), scoped to a pillar. Both sides are genuinely on-voice — the only
// difference is the axis. Divij's pick is the training signal; there is no
// "correct" side.
//
// Divij's hard requirement (said 3×): "a lot of variance… capture extremes… so
// we see where one's taste lies." So this script does NOT trust the model to
// self-police contrast. After each batch it runs a per-axis VALIDATOR that
// measures the contrast structurally (length gap, line-break count, anchor
// presence, word-overlap) and DROPS any pair whose two sides aren't far enough
// apart. It keeps requesting until each (pillar × axis) hits TARGET_PER_AXIS, so
// every bucket fills toward ~50 with only genuine extremes.
//
// Cost: bounded by MAX_ROUNDS — at most PILLARS × AXES × MAX_ROUNDS Opus calls,
// run once. Two sides are modelled as named string fields (NOT an items array
// with length constraints — those get stripped by structured output).

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

// ── how full / how extreme ──────────────────────────────────────────────────
const TARGET_PER_AXIS = 9; // 9 × 6 axes = 54 per bucket — comfortably past Divij's "50"
const PER_CALL = 4; // request 4, keep the ones that clear the contrast bar
const MAX_ROUNDS = 4; // give up topping-up an axis after this many calls
const OVERLAP_CEILING = 0.6; // >60% shared words ⇒ not "extremes" — reject
const MIN_PER_PILLAR = 18; // safety floor: never WIPE the live deck to replace it with a thinner one

// One axis = one dimension of taste, with its two opposite extremes named, plus
// a `hard` clause the model must obey and a `valid()` that STRUCTURALLY verifies
// the two sides actually landed on opposite poles (so we never store a pair that
// only *claims* to contrast).
type AxisDef = {
  key: string;
  desc: string;
  left: string;
  right: string;
  hard: string;
  valid: (lt: string, rt: string) => boolean;
};

const AXES: AxisDef[] = [
  {
    key: "hook",
    desc: "the shape of the opening line",
    left: "opens on a bold, declarative claim",
    right: "opens on an open question or a slow setup",
    hard: "LEFT must open on a flat declarative statement; RIGHT must open on a question or an unhurried setup. They must NOT open on the same word.",
    valid: (lt, rt) => firstWord(lt) !== firstWord(rt),
  },
  {
    key: "length",
    desc: "overall length",
    left: "terse — one or two tight lines, nothing extra",
    right: "developed — several short paragraphs that build",
    hard: "LEFT must be UNDER ~240 characters (one or two tight lines). RIGHT must be 400+ characters across several short paragraphs.",
    valid: (lt, rt) => lt.length <= 260 && rt.length - lt.length >= 140,
  },
  {
    key: "register",
    desc: "tone register",
    left: "punchy and casual, close to how you'd say it out loud",
    right: "measured and composed, more considered",
    hard: "LEFT must read casual and spoken; RIGHT must read measured and composed. Same idea, clearly different temperature.",
    valid: () => true, // tone isn't structurally measurable — the overlap floor + prompt carry it
  },
  {
    key: "claim_density",
    desc: "how concrete it is",
    left: "anchored on a specific number or stat",
    right: "abstract — the idea stated without a concrete anchor",
    hard: "LEFT must contain at least one HARD anchor — a specific number, %, count, or date (e.g. '3 clients', '40% faster', 'last Tuesday'). RIGHT must contain NO numbers at all — state the same idea fully abstractly, no quantities.",
    valid: (lt, rt) => hasAnchor(lt) && !hasAnchor(rt),
  },
  {
    key: "opener",
    desc: "the entry point",
    left: "cold-opens straight into the moment",
    right: "context-first — frames the situation, then lands the point",
    hard: "LEFT must drop the reader mid-moment with no setup; RIGHT must frame the situation first, then land the point. Different opening words.",
    valid: (lt, rt) => firstWord(lt) !== firstWord(rt),
  },
  {
    key: "rhythm",
    desc: "line rhythm",
    left: "line-break-heavy, one thought per line",
    right: "flowing — sentences run together as prose",
    hard: "LEFT must put one thought per line with multiple line breaks; RIGHT must run as flowing prose with NO line breaks.",
    valid: (lt, rt) => newlines(lt) >= 2 && newlines(rt) === 0,
  },
];

// ── structural contrast helpers (no model call) ─────────────────────────────
function words(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean)
  );
}
function overlap(a: string, b: string): number {
  const A = words(a), B = words(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}
function firstWord(s: string): string {
  const raw = (s.trim().split(/\s+/)[0] ?? "").toLowerCase();
  // Strip punctuation so `"Design"` matches `Design`. But an emoji- or
  // punctuation-only opener would strip to "" and make two visibly-different
  // openers compare EQUAL (silently dropping a good pair) — keep the raw token then.
  return raw.replace(/[^\p{L}\p{N}]/gu, "") || raw;
}
function newlines(s: string): number {
  return (s.match(/\n/g) ?? []).length;
}
// A hard anchor = a digit (number / % / count / date) or an @handle. We deliberately
// do NOT count a Capitalized word as an anchor: mid-sentence caps are far too common in
// real prose, so the old proper-noun heuristic false-flagged abstract RIGHT sides and
// dropped good pairs. The claim_density axis is measured on the one robust, unambiguous
// extreme — a concrete number vs none.
function hasAnchor(s: string): boolean {
  if (/\d/.test(s)) return true;
  if (/@[A-Za-z]/.test(s)) return true;
  return false;
}

// Does this pair clear the bar for its axis? Generic overlap floor + the
// axis-specific structural check.
function clears(axis: AxisDef, lt: string, rt: string): boolean {
  if (!lt || !rt || lt === rt) return false;
  if (overlap(lt, rt) > OVERLAP_CEILING) return false;
  return axis.valid(lt, rt);
}

// A few grounded topics per pillar so the model writes real Bricx posts, not
// generic filler. These are starting points; the model varies them per pair.
const SEEDS: Record<Pillar, string[]> = {
  design: [
    "strong design opinions online vs an actual shipped portfolio",
    "a small craft detail in a UI that most people walk past",
    "what separates designers who ship inside real constraints from ones who only post",
    "a redesign that looked worse but tested better",
    "the cost of one extra field in a form",
  ],
  company: [
    "an unexpected inbound lead that arrived through a referral you can't trace",
    "hiring for a role because the same client request kept coming back",
    "an honest update about the team outgrowing its own processes",
    "turning down a client whose brief didn't fit",
    "a process that worked at 3 people and broke at 8",
  ],
  experiment: [
    "a what-if about collapsing onboarding into a single screen",
    "a small experiment that changed how the team thinks about a flow",
    "a contrarian test you ran and what it actually showed",
    "killing a feature to see if anyone noticed",
    "a pricing page A/B test with a counter-intuitive result",
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

async function genFor(
  pillar: Pillar,
  axis: AxisDef,
  round: number,
  avoid: string[]
): Promise<Pair[]> {
  const hint = PILLAR_META[pillar].hint || "a normal post — just Divij's voice, no special steer";
  const system = `${RULES}

---

# Your job right now

You are generating CONTRAST PAIRS to calibrate one reviewer's taste. Each pair is the SAME underlying idea written two ways, pushed to OPPOSITE EXTREMES of ONE axis. Both versions must be genuinely publishable in this voice — neither is a strawman. There is no "correct" side; the contrast is the whole point. The two sides must be UNMISTAKABLY different on the axis — a reader should never have to squint to tell which is which. Never label which is better.`;

  // Rotate the seed emphasis by round so successive calls explore new topics.
  const seeds = SEEDS[pillar];
  const lead = seeds[round % seeds.length];
  const avoidLine = avoid.length
    ? `\nDo NOT reuse these openings (already written): ${avoid.slice(0, 8).map((a) => JSON.stringify(a)).join("; ")}.`
    : "";

  const user = `Write ${PER_CALL} contrast pairs for the "${pillar}" pillar (${PILLAR_META[pillar].label}).
Pillar context: ${hint}

Axis to contrast: ${axis.key} — ${axis.desc}.
  • LEFT side: ${axis.left}.
  • RIGHT side: ${axis.right}.

HARD CONSTRAINT (both sides must obey, or the pair is useless):
${axis.hard}

Rules for every pair:
- LEFT and RIGHT are the SAME post idea — only the ${axis.key} axis differs, pushed to its two OPPOSITE EXTREMES. A reader should feel they're choosing a flavor of the same tweet, not two unrelated tweets — but the flavor difference must be obvious.
- Both sides fully on-voice (obey the rules above). No rule violations on either side.
- Each pair uses a DIFFERENT, specific topic. Start from "${lead}" but go beyond it; vary across: ${seeds.join("; ")}.${avoidLine}
- Real, specific, concrete — no placeholder names or lorem.
- left_meta / right_meta: a 2-4 word tag naming this side's extreme.

Return ${PER_CALL} pairs.`;

  const params = {
    model: "claude-opus-4-8",
    max_tokens: 8000,
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
  let calls = 0;
  let dropped = 0;

  for (const pillar of PILLARS) {
    for (const axis of AXES) {
      const kept: Pair[] = [];
      const seenKeys = new Set<string>();
      for (let round = 0; round < MAX_ROUNDS && kept.length < TARGET_PER_AXIS; round++) {
        calls++;
        let pairs: Pair[] = [];
        try {
          const avoid = kept.map((p) => p.left_text.slice(0, 40));
          pairs = await genFor(pillar, axis, round, avoid);
        } catch (e) {
          console.error(`  ✗ ${pillar}/${axis.key} r${round}: ${String(e)}`);
          continue;
        }
        for (const p of pairs) {
          const lt = (p.left_text ?? "").trim();
          const rt = (p.right_text ?? "").trim();
          if (!clears(axis, lt, rt)) {
            dropped++;
            continue; // not extreme enough — Divij wants extremes
          }
          const key = `${lt.slice(0, 48)}|${rt.slice(0, 48)}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          kept.push({ ...p, left_text: lt, right_text: rt });
          if (kept.length >= TARGET_PER_AXIS) break;
        }
      }
      for (const p of kept) {
        inserts.push({
          pillar,
          axis: axis.key,
          leftText: p.left_text,
          rightText: p.right_text,
          leftMeta: (p.left_meta ?? "").trim() || axis.left,
          rightMeta: (p.right_meta ?? "").trim() || axis.right,
          source: "opus-seed",
        });
      }
      const flag = kept.length < TARGET_PER_AXIS ? " ⚠ under target" : "";
      console.log(`  ✓ ${pillar}/${axis.key}: kept ${kept.length}/${TARGET_PER_AXIS}${flag}`);
    }
  }

  // SAFETY FLOOR: the delete below WIPES the live deck before re-inserting. Only
  // proceed if this run actually produced a healthy deck — otherwise a weak/over-
  // rejected run would strand /train thinner (or empty) than before. If any bucket
  // is below the floor, leave prod UNTOUCHED and bail loudly.
  const newByPillar: Record<string, number> = {};
  for (const i of inserts) newByPillar[i.pillar as string] = (newByPillar[i.pillar as string] ?? 0) + 1;
  const starved = PILLARS.filter((p) => (newByPillar[p] ?? 0) < MIN_PER_PILLAR);
  if (starved.length) {
    console.error(
      `\n✗ ABORTED — new run too thin (${PILLARS.map((p) => `${p}=${newByPillar[p] ?? 0}`).join("  ")}; ` +
        `floor ${MIN_PER_PILLAR}/bucket). Live deck left UNTOUCHED. Re-run gen:pairs, or lower the contrast bar.`
    );
    process.exit(1);
  }

  await db.delete(tastePairs).where(eq(tastePairs.source, "opus-seed"));
  await db.insert(tastePairs).values(inserts);

  const byPillar: Record<string, number> = {};
  for (const i of inserts) byPillar[i.pillar as string] = (byPillar[i.pillar as string] ?? 0) + 1;
  console.log(
    `\nInserted ${inserts.length} taste_pairs ` +
      `(${Object.entries(byPillar).map(([p, c]) => `${p}=${c}`).join("  ")}).`
  );
  console.log(`Opus calls: ${calls}   dropped (failed contrast bar): ${dropped}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
