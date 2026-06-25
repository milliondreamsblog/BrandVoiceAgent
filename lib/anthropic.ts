import Anthropic from "@anthropic-ai/sdk";

// Production voice output stays on Opus 4.8. Centralized here so non-prod runs
// (e.g. the e2e gate) can drop to a cheap model with TONE_MODEL=claude-haiku-4-5
// without touching code. Never silently switch prod — the default is Opus.
export const TONE_MODEL = process.env.TONE_MODEL || "claude-opus-4-8";

// True only when a real API key is present. Routes call this to fail fast with a
// clear 503 instead of letting the SDK 401 on the placeholder key below (which
// otherwise surfaces as silent zero-rewrite batches in /review).
export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type SystemBlock = {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
};

// Build the `system` param as cache-control'd blocks. The first block is the
// static ~7.4K-token voice rubric — byte-identical across every call site — so it
// is written to cache once per 5-min window and read at ~10% input cost by every
// subsequent Opus call (generate / critique / rehook) within that window. Any
// volatile blocks (e.g. per-draft calibration) follow it uncached.
export function cachedSystem(rubric: string, ...volatile: string[]): SystemBlock[] {
  return [
    { type: "text", text: rubric, cache_control: { type: "ephemeral" } },
    ...volatile.map((text): SystemBlock => ({ type: "text", text })),
  ];
}

// Constructed with a fallback so importing this module never throws at build time
// when the key is absent. The route guards against a missing key before any real call.
export const anthropic = new Anthropic({
  apiKey: (process.env.ANTHROPIC_API_KEY || "MISSING_ANTHROPIC_API_KEY").replace(/^﻿/, ""),
});
