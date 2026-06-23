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

  async function react(body: Record<string, unknown>) {
    setBusy(true);
    try {
      await fetch("/api/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, rewriteId: rewrite.id, ...body }),
      });
      await onAfter();
    } finally {
      setBusy(false);
    }
  }

  // The text a rehook operates on / a pick promotes: Divij's saved edit if any,
  // else the rewrite itself.
  const currentText = edit ?? rewrite.text;

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

  // Swap the chosen hook into the first line and PERSIST as an edit, so the
  // re-hooked version is what gets promoted on pick.
  async function applyHook(hook: string) {
    const newText = swapFirstLine(currentText, hook);
    await react({ type: "edit", payload: newText });
    setRehookOpen(false);
    setRehookHooks(null);
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

      {/* Show the LIVE text (Divij's edit / re-hooked version if any), so the
          rehook visibly rewrites the card's first line — not just the edit block. */}
      <TweetCard text={currentText} media={media} idx={idx} onRehook={openRehook} />

      {rehookOpen && (
        <div className="rehook-pop">
          <p className="rehook-pop-title">↻ change the hook — pick a new opening line</p>
          {rehookLoading && <p className="rehook-pop-msg">Generating hooks…</p>}
          {rehookErr && <p className="rehook-pop-msg">{rehookErr}</p>}
          {rehookHooks?.map((h, i) => (
            <button
              key={i}
              className="rehook-opt"
              disabled={busy}
              onClick={() => applyHook(h)}
            >
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
          </div>
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
            // Re-seed the textarea with the latest saved text (e.g. after a
            // rehook) when opening, so Save can't silently revert it.
            if (!editOpen) setEditText(currentText);
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
        disabled={busy || (anyPicked && !picked)}
        onClick={() => react({ type: "pick" })}
      >
        {picked ? "✓ Picked" : "Pick this one ↑"}
      </button>
    </div>
  );
}
