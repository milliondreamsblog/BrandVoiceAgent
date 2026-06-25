// POST /api/ideas/extract — mine idea seeds from pasted source material.
//   body: { source: 'braindump' | 'tldv', text: string }  ->  { ideas: [...] }
//
// One cheap Haiku call (no voice rubric). Survivors are deduped against what the
// founder has already seen (existing ideas + recent posts + taste examples) and
// inserted as ideas(status='pending'). No Opus spend here.

export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ideas, posts, tasteExamples } from "@/lib/db/schema";
import { isConfigured } from "@/lib/anthropic";
import { extractIdeas } from "@/lib/extractIdeas";
import { normalizeInput, type IdeaSource } from "@/lib/normalizeTranscript";
import { tokens } from "@/lib/retrieve";

const SIM_THRESHOLD = 0.6; // token-Jaccard above this ⇒ "already seen", drop it

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export async function POST(req: NextRequest) {
  try {
    if (!isConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const source: IdeaSource = body.source === "tldv" ? "tldv" : "braindump";
    const text = normalizeInput(String(body.text ?? ""), source);
    if (text.length < 20) {
      return NextResponse.json(
        { error: "Paste some source material first." },
        { status: 400 }
      );
    }

    const seeds = await extractIdeas(text);
    if (!seeds.length) {
      return NextResponse.json({
        ideas: [],
        note: "No postable ideas found in that input.",
      });
    }

    // Dedup vs what he's already seen.
    const [existingIdeas, recentPosts, examples] = await Promise.all([
      db.select({ seed: ideas.seed, angle: ideas.angle }).from(ideas),
      db
        .select({ body: posts.body })
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(50),
      db.select({ approvedText: tasteExamples.approvedText }).from(tasteExamples),
    ]);

    const priorSets: Set<string>[] = [
      ...existingIdeas.map((r) => new Set(tokens(`${r.seed} ${r.angle}`))),
      ...recentPosts.map((r) => new Set(tokens(r.body))),
      ...examples.map((r) => new Set(tokens(r.approvedText))),
    ];

    const fresh = seeds.filter((s) => {
      const sTokens = new Set(tokens(`${s.seed} ${s.angle}`));
      return !priorSets.some((p) => jaccard(sTokens, p) > SIM_THRESHOLD);
    });

    if (!fresh.length) {
      return NextResponse.json({
        ideas: [],
        note: "All extracted ideas looked like ones you already have.",
      });
    }

    const inserted = await db
      .insert(ideas)
      .values(
        fresh.map((s) => ({
          source,
          rawInput: text.slice(0, 2000), // short slice for traceability
          seed: s.seed.trim(),
          angle: s.angle.trim(),
          bucket: s.bucket,
          confidence: s.confidence,
          sourceQuote: s.source_quote,
        }))
      )
      .returning();

    return NextResponse.json({ ideas: inserted });
  } catch (e) {
    console.error("POST /api/ideas/extract failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
