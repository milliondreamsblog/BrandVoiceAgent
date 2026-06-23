// The loop: retrieve real approved examples, then generate three publish-ready
// rewrites in Divij's voice. One Opus call; retrieval makes it taste-aware.

import fs from "fs";
import path from "path";
import { anthropic } from "./anthropic";
import { GENERATION_SCHEMA, type Generation } from "./genSchema";
import { retrieveExamples } from "./retrieve";
import { PILLAR_META, type Pillar } from "./pillars";

// The voice rubric (19 rules + anchors) is the base system prompt.
const RULES = fs.readFileSync(
  path.join(process.cwd(), "tone-agent", "voice-critic.system.md"),
  "utf8"
);

export async function generateRewrites(
  draft: string,
  mediaNote?: string,
  pillar?: Pillar
): Promise<Generation> {
  const examples = await retrieveExamples(draft, 4);

  const calibration = examples
    .map((e, i) => {
      const before = e.original ? `BEFORE:\n${e.original}\n\n` : "";
      const why = e.editNotes ? `\nWHY DIVIJ CHANGED IT: ${e.editNotes}` : "";
      return `### Calibration ${i + 1}${e.category ? ` — ${e.category}` : ""}\n${before}APPROVED (Divij's voice):\n${e.approvedText}${why}`;
    })
    .join("\n\n");

  const system = `${RULES}

---

# Live calibration — real approved examples retrieved for THIS draft

These are real before/after pairs from Divij, chosen because they're closest to the draft you're rewriting. Match this voice. The "WHY DIVIJ CHANGED IT" lines are his actual reasoning — internalize the taste behind them, don't just avoid rule violations. A rewrite that breaks no rules but feels sanded-clean and lifeless is a failure.

${calibration}`;

  const userContent = `Rewrite this draft into three publish-ready versions in Divij's voice.

- A — Minimal fix: resolve only what breaks the voice. Keep his words where they already work.
- B — Reangled: same story, a different hook or entry point.
- C — Sharpest: cut every line doing rhythm instead of carrying weight; the boldest version that's still unmistakably on-voice.

For each version give a one-sentence rationale and a publish_score from 0-100 meaning "how likely Divij publishes this as-is." Then name the single version you recommend.${
    mediaNote
      ? `\n\nNote: this post ships with ${mediaNote} — don't describe what the visual already shows.`
      : ""
  }${
    pillar && PILLAR_META[pillar].hint
      ? `\n\nPillar context: ${PILLAR_META[pillar].hint}`
      : ""
  }

DRAFT:
${draft}`;

  const params = {
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system,
    messages: [{ role: "user", content: userContent }],
    output_config: {
      format: { type: "json_schema", schema: GENERATION_SCHEMA },
    },
  };

  const res: any = await anthropic.messages.create(params as any);
  const textBlock = (res?.content ?? []).find((b: any) => b?.type === "text");
  const text: string = textBlock?.text ?? "";
  if (!text) throw new Error("Empty response from the model.");

  return JSON.parse(text) as Generation;
}
