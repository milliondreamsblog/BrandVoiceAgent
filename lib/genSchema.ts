// Structured-output contract for the rewrite generator (the "loop" that turns a
// writer's draft into three publish-ready versions in Divij's voice).

export interface GenRewrite {
  label: "A" | "B" | "C";
  text: string;
  rationale: string;
  publish_score: number; // 0-100: "how likely Divij publishes this as-is"
}

export interface Generation {
  rewrites: GenRewrite[];
  recommended: "A" | "B" | "C";
}

export const GENERATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rewrites", "recommended"],
  properties: {
    rewrites: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "text", "rationale", "publish_score"],
        properties: {
          label: { type: "string", enum: ["A", "B", "C"] },
          text: { type: "string" },
          rationale: { type: "string" },
          publish_score: { type: "integer" },
        },
      },
    },
    recommended: { type: "string", enum: ["A", "B", "C"] },
  },
} as const;
