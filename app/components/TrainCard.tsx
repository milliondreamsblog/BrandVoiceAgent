"use client";
import { useState } from "react";
import TweetCard from "./TweetCard";
import { swapFirstLine } from "../../lib/text";
import type { Pillar } from "../../lib/pillars";

// One side of a /train this-or-that pair. The card itself stays click-to-select;
// the ✎ edit / 💬 why / ↻ hook controls live BELOW it (not nested inside the
// selectable <button>) so Divij can refine either option before he commits a
// pick. The refined text + note are lifted to the parent, which sends the
// CHOSEN side's refinement on "Next →" — that's the distilled signal.
export default function TrainCard({
  text,
  meta,
  idx,
  pillar,
  selected,
  disabled,
  override,
  note,
  onSelect,
  onOverride,
  onNote,
}: {
  text: string;
  meta: string | null;
  idx: number;
  pillar: Pillar;
  selected: boolean;
  disabled: boolean;
  // Divij's edited/re-hooked version of this side (null = keep as written).
  override: string | null;
  note: string;
  onSelect: () => void;
  onOverride: (t: string | null) => void;
  onNote: (t: string) => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState("");
  const [cmtOpen, setCmtOpen] = useState(false);
  const [cmtText, setCmtText] = useState("");
  const [rehookOpen, setRehookOpen] = useState(false);
  const [rehookLoading, setRehookLoading] = useState(false);
  const [rehookHooks, setRehookHooks] = useState<string[] | null>(null);
  const [rehookErr, setRehookErr] = useState<string | null>(null);

  // What the card shows / what a rehook & a pick operate on: Divij's edit if any,
  // else the original variant.
  const displayText = override ?? text;
  const edited = override != null && override !== text;

  // Only one box open at a time per card — keeps the narrow column readable.
  function closeBoxes() {
    setEditOpen(false);
    setCmtOpen(false);
    setRehookOpen(false);
  }

  async function openRehook() {
    if (rehookOpen) {
      setRehookOpen(false);
      return;
    }
    setEditOpen(false);
    setCmtOpen(false);
    setRehookOpen(true);
    setRehookHooks(null);
    setRehookErr(null);
    setRehookLoading(true);
    try {
      const res = await fetch("/api/rewrites/rehook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewriteText: displayText, pillar }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't fetch new hooks");
      const hooks: string[] = (data.hooks ?? [])
        .map((h: { text?: string }) => (h?.text ?? "").trim())
        .filter(Boolean);
      if (!hooks.length) throw new Error("No hooks came back");
      setRehookHooks(hooks);
    } catch (e) {
      setRehookErr((e as Error).message);
    } finally {
      setRehookLoading(false);
    }
  }

  // Re-hook commits straight to the override (the card shows it live, and the
  // pick promotes it) — the narrow side-by-side has no room for a preview layer.
  function applyHook(hook: string) {
    onOverride(swapFirstLine(displayText, hook));
    setRehookOpen(false);
  }

  return (
    <div className="train-col">
      <TweetCard
        text={displayText}
        idx={idx}
        onClick={onSelect}
        selected={selected}
        disabled={disabled}
      />
      {meta && <span className="train-meta">{meta}</span>}

      <div className="train-card-actions">
        <button
          type="button"
          className={`rw-btn${editOpen ? " open" : ""}`}
          onClick={() => {
            if (editOpen) {
              setEditOpen(false);
            } else {
              setEditText(displayText);
              closeBoxes();
              setEditOpen(true);
            }
          }}
          disabled={disabled}
          title="Rewrite it in your own words"
        >
          ✎ <span>Edit</span>
        </button>
        <button
          type="button"
          className={`rw-btn${cmtOpen ? " open" : ""}`}
          onClick={() => {
            if (cmtOpen) {
              setCmtOpen(false);
            } else {
              setCmtText(note);
              closeBoxes();
              setCmtOpen(true);
            }
          }}
          disabled={disabled}
          title="Say why — the reason is the gold"
        >
          💬 <span>Why</span>
        </button>
        <button
          type="button"
          className={`rw-btn${rehookOpen ? " open" : ""}`}
          onClick={openRehook}
          disabled={disabled}
          title="Try a different opening hook"
        >
          ↻ <span>Hook</span>
        </button>
      </div>

      {rehookOpen && (
        <div className="rehook-pop">
          <p className="rehook-pop-title">↻ try a different hook — tap one to use it</p>
          {rehookLoading && <p className="rehook-pop-msg">Generating hooks…</p>}
          {rehookErr && <p className="rehook-pop-msg">{rehookErr}</p>}
          {rehookHooks?.map((h, i) => (
            <button
              key={i}
              className="rehook-opt"
              disabled={disabled}
              onClick={() => applyHook(h)}
            >
              {h}
            </button>
          ))}
          <div className="rehook-pop-actions">
            <button
              className="btn-ghost"
              onClick={() => setRehookOpen(false)}
              disabled={disabled}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="rw-box">
          <textarea
            className="draft rw-textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="rw-box-foot">
            <button className="btn-ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-secondary"
              disabled={disabled}
              onClick={() => {
                // Empty / unchanged → drop the override so this stays the variant.
                const next = editText.trim();
                onOverride(next && next !== text ? editText : null);
                setEditOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {cmtOpen && (
        <div className="rw-box">
          <textarea
            className="draft rw-textarea"
            placeholder="Why does this read like you? The reason is the gold."
            value={cmtText}
            onChange={(e) => setCmtText(e.target.value)}
          />
          <div className="rw-box-foot">
            <button className="btn-ghost" onClick={() => setCmtOpen(false)}>
              Cancel
            </button>
            <button
              className="btn-secondary"
              disabled={disabled}
              onClick={() => {
                onNote(cmtText.trim());
                setCmtOpen(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {edited && (
        <div className="train-edited">
          <span className="rw-edit-label">✎ your version</span>
          <button
            className="preview-banner-revert"
            onClick={() => onOverride(null)}
            disabled={disabled}
            title="Drop your changes and show the original wording"
          >
            ↺ revert
          </button>
        </div>
      )}
      {note.trim() && <p className="rw-comment train-note">💬 {note}</p>}
    </div>
  );
}
