// POST /api/rewrites/rehook — generate 3 alternative opening lines for a rewrite.
//   body: { rewriteText, pillar?, mediaNote? }  →  { hooks: [{ text }] }
//
// Only the FIRST line changes; the body stays as written. The client swaps the
// hook in and persists the result as a type:'edit' reaction, so a re-hooked post
// is what gets promoted to taste_examples on pick.

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { anthropic } from "@/lib/anthropic";
import { PILLAR_META, coercePillar } from "@/lib/pillars";

const RULES = fs.readFileSync(
  path.join(process.cwd(), "tone-agent", "voice-critic.system.md"),
  "utf8"
);

// Array of {text} with NO length constraints — those are stripped by structured
// output. Count is enforced (slice to 3) in app code below.
const HOOK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["hooks"],
  properties: {
    hooks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text"],
        properties: { text: { type: "string" } },
      },
    },
  },
} as const;

type Body = { rewriteText?: string; pillar?: string; mediaNote?: string };

export async function POST(req: NextRequest) {
  try {
    // Guard the missing key explicitly — lib/anthropic substitutes a placeholder
    // that would otherwise 401 deep in the SDK with a confusing message.
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 503 }
      );
    }

    const { rewriteText, pillar: pillarRaw, mediaNote } = (await req.json()) as Body;
    if (!rewriteText?.trim()) {
      return NextResponse.json({ error: "rewriteText is required" }, { status: 400 });
    }

    const pillar = coercePillar(pillarRaw);
    const firstLine = rewriteText.split("\n")[0];

    const system = `${RULES}

---

# Your job right now

Generate three alternative OPENING LINES (hooks) for an already-good post. Only the first line changes; the body stays exactly as written. Each hook is a genuinely different angle into the same post and is fully on-voice. No hook restates another. Return only the hook line itself — no body, no surrounding quotes, no numbering.`;

    const user = `The post's current first line is:
"${firstLine}"

Write three replacement opening lines. Each must lead naturally into the rest of the post below and obey every voice rule. Vary the angle across the three — e.g. a sharper claim, an honest question, a concrete detail, a contradiction — but every option must be unmistakably on-voice.${
      pillar && PILLAR_META[pillar].hint
        ? `\n\nPillar context: ${PILLAR_META[pillar].hint}`
        : ""
    }${
      mediaNote
        ? `\n\nNote: this post ships with ${mediaNote} — don't describe what the visual already shows.`
        : ""
    }

FULL POST:
${rewriteText}`;

    const params = {
      model: "claude-opus-4-8",
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema: HOOK_SCHEMA } },
    };

    const res: any = await anthropic.messages.create(params as any);
    const text: string =
      (res?.content ?? []).find((b: any) => b?.type === "text")?.text ?? "";
    if (!text) throw new Error("Empty response from the model.");

    const parsed = JSON.parse(text) as { hooks?: { text?: string }[] };
    const hooks = (parsed.hooks ?? [])
      .map((h) => (h?.text ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);

    if (hooks.length === 0) {
      return NextResponse.json({ error: "No hooks were generated." }, { status: 502 });
    }

    return NextResponse.json({ hooks: hooks.map((t) => ({ text: t })) });
  } catch (e) {
    console.error("POST /api/rewrites/rehook failed:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
