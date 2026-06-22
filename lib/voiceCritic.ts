import fs from "fs";
import path from "path";
import { anthropic } from "./anthropic";
import { CRITIQUE_SCHEMA, type Critique } from "./schema";

// The rubric IS the system prompt. Loaded once at module init (server-side only).
const SYSTEM = fs.readFileSync(
  path.join(process.cwd(), "tone-agent", "voice-critic.system.md"),
  "utf8",
);

export async function critiqueDraft(draft: string): Promise<Critique> {
  const params = {
    model: "claude-opus-4-8",
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content:
          "Critique this draft against the voice rules. Return only the structured verdict, with every finding tied to a specific rule number.\n\nDRAFT:\n" +
          draft,
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: CRITIQUE_SCHEMA },
    },
  };

  // Cast at the call boundary so we don't depend on the exact SDK type version for
  // output_config. The runtime support for structured outputs is what matters.
  const res: any = await anthropic.messages.create(params as any);

  const textBlock = (res?.content ?? []).find((b: any) => b?.type === "text");
  const text: string = textBlock?.text ?? "";
  if (!text) throw new Error("Empty response from the model.");

  return JSON.parse(text) as Critique;
}
