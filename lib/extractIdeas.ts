// Idea extraction — the upstream front-stage of the Content Ideation Agent.
// Reads the founder's pasted material (brain-dump or tl;dv transcript) and mines
// distinct, postable idea seeds, each classified into one of the 3 content pillars.
//
// This is NOT voice work — it runs on a cheap model with NO voice rubric. The
// founder approves seeds; only an approved seed later spends Opus through the
// existing writing pipeline. The agent never invents facts: every seed quotes the
// source line it came from.

import { anthropic, isConfigured } from "./anthropic";
import { IDEA_SCHEMA, type IdeaSeed } from "./ideaSchema";
import { PILLARS } from "./pillars";

const IDEATION_MODEL = process.env.IDEATION_MODEL || "claude-haiku-4-5";
const MAX_SEEDS = 12;

const SYSTEM = `You mine social-media content ideas from raw material a founder gives you, for the agency "Bricx". The input is either the founder's brain-dump notes or a transcript of a real Bricx meeting.

Pull out DISTINCT, postable idea seeds — each a single thing worth a post: a decision made, a result observed, an opinion voiced, a lesson learned, a moment worth narrating. Ignore chit-chat, logistics, and anything not postable.

For EACH seed return:
- seed: a one-line hook (the angle in a sentence; not the final post)
- angle: 1-2 sentences developing it enough that a writer could draft from it
- bucket: classify into exactly one —
    "company"    = agency updates: real happenings, hires, client wins/losses, process changes, milestones
    "experiment" = experiments, contrarian bets, tests run, what-ifs, things being tried
    "design"     = craft, UI/product opinions, shipped work, design taste
- confidence: 0-100, how strong and postable this idea is
- source_quote: the exact phrase/line from the input this is grounded in

Hard rules:
- NEVER invent facts, numbers, names, or events not present in the input. If the material is thin, return fewer (or zero) seeds — do not pad.
- Each seed is genuinely different from the others. No duplicates or rephrasings.
- Order best-first (highest confidence first). At most ${MAX_SEEDS}.`;

export async function extractIdeas(input: string): Promise<IdeaSeed[]> {
  if (!isConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const params = {
    model: IDEATION_MODEL,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `SOURCE MATERIAL:\n\n${input}` }],
    output_config: { format: { type: "json_schema", schema: IDEA_SCHEMA } },
  };

  const res: any = await anthropic.messages.create(params as any);
  const text: string =
    (res?.content ?? []).find((b: any) => b?.type === "text")?.text ?? "";
  if (!text) throw new Error("Empty response from the model.");

  const parsed = JSON.parse(text) as { ideas?: IdeaSeed[] };
  const validBucket = new Set<string>(PILLARS);
  return (parsed.ideas ?? [])
    .filter(
      (s) => s?.seed?.trim() && s?.angle?.trim() && validBucket.has(s.bucket)
    )
    .slice(0, MAX_SEEDS);
}
