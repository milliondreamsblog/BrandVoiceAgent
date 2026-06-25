// Structured-output contract for the Content Ideation Agent's extraction pass.
// One cheap model call reads the founder's pasted material and returns idea seeds,
// each classified into a content pillar. Mirrors lib/genSchema.ts. No array-length
// constraint (unsupported by output_config) — the count is clamped in app code.

export type IdeaBucket = "company" | "experiment" | "design";

export interface IdeaSeed {
  seed: string; // one-line hook
  angle: string; // 1-2 sentence developed angle → becomes posts.body on draft
  bucket: IdeaBucket;
  confidence: number; // 0-100: how strong/postable this idea is
  source_quote: string; // the line from the source it was grounded in
}

export interface IdeaExtraction {
  ideas: IdeaSeed[];
}

export const IDEA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["ideas"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["seed", "angle", "bucket", "confidence", "source_quote"],
        properties: {
          seed: { type: "string" },
          angle: { type: "string" },
          bucket: { type: "string", enum: ["company", "experiment", "design"] },
          confidence: { type: "integer" },
          source_quote: { type: "string" },
        },
      },
    },
  },
} as const;
