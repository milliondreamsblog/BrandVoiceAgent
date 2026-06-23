// The three content pillars a writer tags a draft with. Single source of truth
// for: the slug stored in posts.pillar, the labels/emojis shown in the UI, the
// order tabs and selectors render in, and the generation hint per pillar.
//
// Display order is a UI concern and lives here — the DB only stores the slug, so
// pillars can be relabelled or reordered without a migration.

export const PILLARS = ["design", "company", "experiment"] as const;
export type Pillar = (typeof PILLARS)[number];

// "Design draft" is the normal draft — the default when nothing is chosen.
export const DEFAULT_PILLAR: Pillar = "design";

// Render order for selectors and tabs: Design → Company Update → Experiment.
export const PILLAR_ORDER: readonly Pillar[] = ["design", "company", "experiment"];

export const PILLAR_META: Record<
  Pillar,
  { label: string; short: string; emoji: string; hint: string }
> = {
  design: {
    label: "Design draft",
    short: "Design",
    emoji: "🎨",
    hint: "", // the normal draft — no special steer, just Divij's voice
  },
  company: {
    label: "Company Update",
    short: "Company",
    emoji: "📣",
    hint: "This is a company update — keep it announcement-clear and factual, lead with the news, and don't over-stylize.",
  },
  experiment: {
    label: "Experiment draft",
    short: "Experiment",
    emoji: "🧪",
    hint: "This is an experimental draft — a looser, more exploratory register is welcome as long as it stays unmistakably on-voice.",
  },
};

// ── Review filter ──
// The /review tabs filter the queue. Besides the three pillars they offer "all"
// (no filter — the whole queue). "all" is NOT a taggable pillar: a draft can
// never *be* "all"; it's only ever a view. So it lives apart from PILLARS and
// is never written to posts.pillar. The API already treats any non-pillar value
// as "show every pillar", so "all" needs no special server handling.
export type PillarFilter = Pillar | "all";
export const PILLAR_FILTER_ORDER: readonly PillarFilter[] = [
  "all",
  ...PILLAR_ORDER,
];
export const ALL_PILLARS_META = {
  label: "All pillars",
  short: "All",
  emoji: "🗂️",
};

// Label/emoji for any review-filter tab, pillar or "all".
export function pillarFilterMeta(f: PillarFilter): {
  label: string;
  short: string;
  emoji: string;
} {
  return f === "all" ? ALL_PILLARS_META : PILLAR_META[f];
}

export function isPillar(v: unknown): v is Pillar {
  return typeof v === "string" && (PILLARS as readonly string[]).includes(v);
}

// Always returns a valid pillar — anything unknown falls back to the default.
export function coercePillar(v: unknown): Pillar {
  return isPillar(v) ? v : DEFAULT_PILLAR;
}
