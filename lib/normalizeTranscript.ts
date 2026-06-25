// Single ingestion seam for the Content Ideation Agent. Turns raw pasted input
// into clean text for extraction. Phase 1 handles a brain-dump and a MANUALLY
// pasted tl;dv transcript. When a paid tl;dv key exists, Phase 2's TranscriptReady
// webhook will flatten its JSON to a string and call THIS — nothing downstream moves.

export type IdeaSource = "braindump" | "tldv";

export function normalizeInput(raw: string, source: IdeaSource): string {
  const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
  if (source !== "tldv") return text;

  // tl;dv transcript chrome cleanup: strip leading "HH:MM[:SS]" / "[HH:MM]"
  // timestamps so the model reads what was said, not the timeline. Speaker labels
  // ("Name:") are kept — who said it is useful signal for attribution.
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
}
