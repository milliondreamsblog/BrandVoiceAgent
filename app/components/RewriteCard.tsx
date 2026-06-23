"use client";
import { useState } from "react";
import TweetCard, { type TweetMedia } from "./TweetCard";
import type { Pillar } from "../../lib/pillars";

// Replace only the first line of `text` with `newHook`; keep the rest verbatim.
function swapFirstLine(text: string, newHook: string): string {
  const nl = text.indexOf("\n");
  if (nl === -1) return newHook; // single-line post → replace the whole thing
  return newHook + text.slice(nl); // keep the newline + body untouched
}

export interface RewriteData {
  id: string;
  label: string;
  text: string;
  rationale: string | null;
  publishScore: number | null;
  recommended: boolean;
}

export default function RewriteCard({
  rewrite,
  postId,
  media,
  idx,
  pillar,
  liked,
  disapproved,
  edit,
  comments,
  picked,
  anyPicked,
  onAfter,
}: {
  rewrite: RewriteData;
  postId: string;
  media?: TweetMedia[];
  idx: number;
  pillar: Pillar;
  liked: boolean;
  disapproved: boolean;
  edit?: string;
  comments: string[];
  picked: boolean;
  anyPicked: boolean;
  onAfter: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(edit ?? rewrite.text);
  const [cmtOpen, setCmtOpen] = useState(false);
  const [cmtText, setCmtText] = useState("");
  const [rehookOpen, setRehookOpen] = useState(false);
  const [rehookLoading, setRehookLoading] = useState(false);
  const [rehookHooks, setRehookHooks] = useState<string[] | null>(null);
  const [rehookErr, setRehookErr] = useState<string | null>(null);
  // A hook the reviewer is PREVIEWING in the card. Nothing is persisted until
  // they hit "Pick this one ↑" — selecting a hook only swaps the visible first
  // line so they can read each option in context first.
  const [previewHook, setPreviewHook] = useState<string | null>(null);

  // Fire a single reaction write (no reload). `react` wraps it with a reload;
  // multi-write flows (pick-with-rehook) post twice then reload once.
  async function postReaction(body: Record<string, unknown>) {
    await fetch("/api/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, rewriteId: rewrite.id, ...body }),
    });
  }

  async function react(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await postReaction(body);
      await onAfter();
    } finally {
      setBusy(false);
    }
  }

  // The persisted base a rehook operates on / a pick promotes: Divij's saved
  // edit if any, else the rewrite itself.
  const currentText = edit ?? rewrite.text;
  // What the card actually shows: the previewed hook swapped into line 1 when
  // one is selected, otherwise the current text. Preview only — not saved.
  const displayText =
    previewHook != null ? swapFirstLine(currentText, previewHook) : currentText;

  async function openRehook() {
    if (rehookOpen) {
      setRehookOpen(false);
      return;
    }
    setRehookOpen(true);
    setRehookHooks(null);
    setRehookErr(null);
    setRehookLoading(true);
    try {
      const res = await fetch("/api/rewrites/rehook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewriteText: currentText, pillar }),
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

  // Selecting a hook only PREVIEWS it (toggle off by re-tapping). Nothing is
  // written here — the choice is committed when "Pick this one ↑" runs.
  function previewOrToggle(hook: string) {
    setPreviewHook((cur) => (cur === hook ? null : hook));
  }

  // Terminal: if a hook is being previewed, persist it as the edit (so the
  // flywheel promotes the re-hooked text) and THEN pick. Otherwise just pick.
  async function pickThis() {
    setBusy(true);
    try {
      if (previewHook != null) {
        await postReaction({
          type: "edit",
          payload: swapFirstLine(currentText, previewHook),
        });
      }
      await postReaction({ type: "pick" });
      await onAfter();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`rw-card${picked ? " rw-picked" : ""}`}>
      <div className="rw-head">
        <span className="review-version-label">Version {rewrite.label}</span>
        <div className="rw-head-tags">
          {rewrite.recommended && <span className="rw-tag rw-rec">★ loop pick</span>}
          {typeof rewrite.publishScore === "number" && (
            <span className="rw-tag rw-score">{rewrite.publishScore}</span>
          )}
        </div>
      </div>

      {/* Show the live text: the previewed hook (if one is selected) swapped
          into the first line, else Divij's current text. */}
      <TweetCard text={displayText} media={media} idx={idx} onRehook={openRehook} />

      {rehookOpen && (
        <div className="rehook-pop">
          <p className="rehook-pop-title">
            ↻ change the hook — tap to preview, then “Pick this one” to keep
          </p>
          {rehookLoading && <p className="rehook-pop-msg">Generating hooks…</p>}
          {rehookErr && <p className="rehook-pop-msg">{rehookErr}</p>}
          {rehookHooks?.map((h, i) => (
            <button
              key={i}
              className={`rehook-opt${previewHook === h ? " active" : ""}`}
              disabled={busy}
              onClick={() => previewOrToggle(h)}
            >
              {previewHook === h ? "👁 previewing — " : ""}
              {h}
            </button>
          ))}
          <div className="rehook-pop-actions">
            <button
              className="btn-ghost"
              onClick={() => setRehookOpen(false)}
              disabled={busy}
            >
              Close
            </button>
            {previewHook != null && (
              <button
                className="btn-ghost"
                onClick={() => setPreviewHook(null)}
                disabled={busy}
                title="Drop the preview and show the original opening line"
              >
                ↺ Use original
              </button>
            )}
          </div>
        </div>
      )}

      {/* Persistent reminder so a previewed-but-unsaved hook is never silent —
          and a top-level revert that works even after the popover is closed. */}
      {previewHook != null && (
        <div className="preview-banner">
          <span className="preview-banner-text">
            👁 Previewing a new hook — <strong>not saved.</strong> “Pick this
            one ↑” keeps it.
          </span>
          <button
            className="preview-banner-revert"
            onClick={() => setPreviewHook(null)}
            disabled={busy}
            title="Drop the preview and show the original opening line"
          >
            ↺ revert
          </button>
        </div>
      )}

      {rewrite.rationale && <p className="review-rationale">{rewrite.rationale}</p>}

      {edit && (
        <div className="rw-edit-shown">
          <span className="rw-edit-label">✎ Divij&apos;s edit</span>
          <p className="rw-edit-text">{edit}</p>
        </div>
      )}

      {comments.length > 0 && (
        <div className="rw-comments">
          {comments.map((c, i) => (
            <p key={i} className="rw-comment">💬 {c}</p>
          ))}
        </div>
      )}

      {/* signal controls */}
      <div className="rw-actions">
        <button
          className={`rw-btn${liked ? " on like" : ""}`}
          onClick={() => react({ type: "like" })}
          disabled={busy}
          title="Like"
        >
          ♥ <span>Like</span>
        </button>
        <button
          className={`rw-btn${disapproved ? " on dis" : ""}`}
          onClick={() => react({ type: "disapprove" })}
          disabled={busy}
          title="Disapprove"
        >
          ✕ <span>Pass</span>
        </button>
        <button
          className={`rw-btn${editOpen ? " open" : ""}`}
          onClick={() => {
            // Re-seed the textarea with what's on screen (incl. a previewed
            // hook) when opening, so Save can't silently revert it.
            if (!editOpen) setEditText(displayText);
            setEditOpen((v) => !v);
          }}
          disabled={busy}
          title="Rewrite a line yourself"
        >
          ✎ <span>Edit</span>
        </button>
        <button
          className={`rw-btn${cmtOpen ? " open" : ""}`}
          onClick={() => setCmtOpen((v) => !v)}
          disabled={busy}
          title="Add a comment"
        >
          💬 <span>Comment</span>
        </button>
      </div>

      {editOpen && (
        <div className="rw-box">
          <textarea
            className="draft rw-textarea"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
          />
          <div className="rw-box-foot">
            <button className="btn-ghost" onClick={() => setEditOpen(false)}>Cancel</button>
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={async () => {
                await react({ type: "edit", payload: editText });
                setPreviewHook(null); // saved text is now the base
                setEditOpen(false);
              }}
            >
              Save edit
            </button>
          </div>
        </div>
      )}

      {cmtOpen && (
        <div className="rw-box">
          <textarea
            className="draft rw-textarea"
            placeholder="Why does this work / not work? The reason is the gold."
            value={cmtText}
            onChange={(e) => setCmtText(e.target.value)}
          />
          <div className="rw-box-foot">
            <button className="btn-ghost" onClick={() => setCmtOpen(false)}>Cancel</button>
            <button
              className="btn-secondary"
              disabled={busy || !cmtText.trim()}
              onClick={async () => {
                await react({ type: "comment", payload: cmtText });
                setCmtText("");
                setCmtOpen(false);
              }}
            >
              Add comment
            </button>
          </div>
        </div>
      )}

      <button
        className={`btn rw-pick${picked ? " rw-pick-done" : ""}`}
        disabled={busy || anyPicked}
        onClick={pickThis}
      >
        {picked
          ? "✓ Picked"
          : previewHook != null
          ? "Pick this one ↑ (with new hook)"
          : "Pick this one ↑"}
      </button>
    </div>
  );
}
