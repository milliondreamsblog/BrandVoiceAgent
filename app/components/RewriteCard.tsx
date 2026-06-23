"use client";
import { useState } from "react";
import TweetCard, { type TweetMedia } from "./TweetCard";

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

      <TweetCard text={rewrite.text} media={media} idx={idx} />

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
          onClick={() => setEditOpen((v) => !v)}
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
