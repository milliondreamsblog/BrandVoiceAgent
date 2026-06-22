// Structured-output contract for the voice critic. Kept in sync with the "Output"
// section of tone-agent/voice-critic.system.md.

export type Severity = "blocking" | "minor";
export type Verdict = "on-voice" | "needs-work" | "off-voice";

export interface Working {
  quote: string;
  note: string;
}

export interface Finding {
  rule: string; // e.g. "Rule 8" or "Rule 8: Periods over commas"
  severity: Severity;
  quote: string;
  why: string;
  fix: string;
}

export interface Critique {
  verdict: Verdict;
  working: Working[];
  findings: Finding[];
  rewrite: string;
}

// JSON Schema passed to output_config.format. No min/max constraints (unsupported);
// every object sets additionalProperties:false and required.
export const CRITIQUE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "working", "findings", "rewrite"],
  properties: {
    verdict: { type: "string", enum: ["on-voice", "needs-work", "off-voice"] },
    working: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["quote", "note"],
        properties: {
          quote: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rule", "severity", "quote", "why", "fix"],
        properties: {
          rule: { type: "string" },
          severity: { type: "string", enum: ["blocking", "minor"] },
          quote: { type: "string" },
          why: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
    rewrite: { type: "string" },
  },
} as const;
