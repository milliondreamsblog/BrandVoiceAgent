"use client";
import { useCallback, useEffect, useState } from "react";
import TweetCard from "../components/TweetCard";
import {
  PILLAR_ORDER,
  PILLAR_META,
  DEFAULT_PILLAR,
  type Pillar,
} from "../../lib/pillars";

type Pair = {
  id: string;
  axis: string;
  leftText: string;
  rightText: string;
  leftMeta: string | null;
  rightMeta: string | null;
};

// Friendly name for the single dimension a pair contrasts — shown so Divij knows
// what he's actually choosing between, which makes the calibration targeted.
const AXIS_LABELS: Record<string, string> = {
  hook: "the opening hook",
  length: "length",
  register: "tone",
  claim_density: "how concrete it is",
  opener: "the entry point",
  rhythm: "line rhythm",
};

const REASON_CHIPS = ["more me", "cleaner", "better hook", "right energy", "sharper"];

function BucketBar({
  bucket,
  onSwitch,
  disabled,
}: {
  bucket: Pillar;
  onSwitch: (b: Pillar) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mode-bar">
      {PILLAR_ORDER.map((p) => (
        <button
          key={p}
          className={`mode-btn${bucket === p ? " active" : ""}`}
          onClick={() => onSwitch(p)}
          disabled={disabled}
        >
          {PILLAR_META[p].emoji} {PILLAR_META[p].short}
        </button>
      ))}
    </div>
  );
}

export default function TrainPage() {
  const [bucket, setBucket] = useState<Pillar>(DEFAULT_PILLAR);
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<"left" | "right" | null>(null);
  const [reasonChip, setReasonChip] = useState<string | null>(null);
  const [strong, setStrong] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [count, setCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // A per-visit session id (client-only, so it can't run during SSR).
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  const load = useCallback(async (b: Pillar) => {
    setPairs(null);
    setIdx(0);
    setChosen(null);
    setReasonChip(null);
    setStrong(false);
    try {
      const res = await fetch(`/api/train/pairs?bucket=${b}`);
      const data = await res.json();
      setPairs(Array.isArray(data.pairs) ? data.pairs : []);
    } catch {
      setPairs([]);
    }
  }, []);

  useEffect(() => {
    load(bucket);
  }, [bucket, load]);

  function switchBucket(b: Pillar) {
    if (b === bucket || submitting) return;
    setBucket(b);
  }

  const pair = pairs && idx < pairs.length ? pairs[idx] : null;

  async function commit(finalChosen: "left" | "right" | "neither") {
    if (submitting || !pair) return;
    setSubmitting(true);
    try {
      await fetch("/api/train/choice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pairId: pair.id,
          chosen: finalChosen,
          reasonChip: finalChosen === "neither" ? null : reasonChip,
          strength: finalChosen !== "neither" && strong ? "strong" : null,
          sessionId,
        }),
      });
      setCount((c) => c + 1);
      setIdx((i) => i + 1);
      setChosen(null);
      setReasonChip(null);
      setStrong(false);
    } catch {
      // network blip — leave state intact so the same pick can be retried
    } finally {
      setSubmitting(false);
    }
  }

  // ── loading ──
  if (!pairs) {
    return (
      <main className="wrap">
        <Header />
        <BucketBar bucket={bucket} onSwitch={switchBucket} />
        <div className="game-card">
          <p className="game-instruction">Loading deck…</p>
        </div>
      </main>
    );
  }

  // ── deck exhausted / empty ──
  if (!pair) {
    return (
      <main className="wrap">
        <Header />
        <BucketBar bucket={bucket} onSwitch={switchBucket} />
        <div className="game-score-screen">
          <div className="game-score-num">{count}</div>
          <div className="game-score-label">
            {count > 0
              ? `calibrated in ${PILLAR_META[bucket].short}. This deck's empty — switch buckets to keep training your voice.`
              : `No pairs left in ${PILLAR_META[bucket].short} yet. Switch buckets, or generate more pairs.`}
          </div>
        </div>
      </main>
    );
  }

  const axisHint = AXIS_LABELS[pair.axis];

  return (
    <main className="wrap">
      <Header />
      <BucketBar bucket={bucket} onSwitch={switchBucket} disabled={submitting} />

      <div className="game-header">
        <span className="game-progress">
          {idx + 1} / {pairs.length} in {PILLAR_META[bucket].short}
        </span>
        <span className="game-score-inline">{count} calibrated</span>
      </div>

      <div className="game-card">
        <p className="game-instruction">
          Which reads more like you?
          {axisHint ? ` · they differ in ${axisHint}` : ""}
        </p>

        <div className="pick-grid">
          <div className="train-col">
            <TweetCard
              text={pair.leftText}
              idx={idx * 2}
              onClick={() => !submitting && setChosen("left")}
              selected={chosen === "left"}
              disabled={submitting}
            />
            {pair.leftMeta && <span className="train-meta">{pair.leftMeta}</span>}
          </div>
          <div className="train-col">
            <TweetCard
              text={pair.rightText}
              idx={idx * 2 + 1}
              onClick={() => !submitting && setChosen("right")}
              selected={chosen === "right"}
              disabled={submitting}
            />
            {pair.rightMeta && <span className="train-meta">{pair.rightMeta}</span>}
          </div>
        </div>

        {chosen && (
          <div className="train-chips">
            <span className="train-chips-label">why? (optional)</span>
            {REASON_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                className={`train-chip${reasonChip === c ? " active" : ""}`}
                onClick={() => setReasonChip(reasonChip === c ? null : c)}
                disabled={submitting}
              >
                {c}
              </button>
            ))}
            <button
              type="button"
              className={`train-chip train-chip-strong${strong ? " active" : ""}`}
              onClick={() => setStrong((s) => !s)}
              disabled={submitting}
            >
              💪 strong
            </button>
          </div>
        )}

        <div className="game-actions train-actions">
          <button
            className="btn-ghost"
            onClick={() => commit("neither")}
            disabled={submitting}
          >
            Neither / skip
          </button>
          <button
            className="btn"
            onClick={() => chosen && commit(chosen)}
            disabled={!chosen || submitting}
          >
            {submitting ? "Saving…" : idx + 1 < pairs.length ? "Next →" : "Finish"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header>
      <span className="accent-label">calibrate your taste</span>
      <h1>Train</h1>
      <p className="sub">
        Pick the version that sounds more like you. Both are on-voice — there&apos;s
        no wrong answer, only your taste. Every pick trains the writer.
      </p>
    </header>
  );
}
