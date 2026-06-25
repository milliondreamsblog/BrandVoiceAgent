"use client";
import { useCallback, useEffect, useState } from "react";
import {
  PILLAR_ORDER,
  PILLAR_META,
  type Pillar,
} from "../../lib/pillars";
import type { IdeaSource } from "../../lib/normalizeTranscript";

type Idea = {
  id: string;
  source: string;
  seed: string;
  angle: string;
  bucket: Pillar;
  confidence: number | null;
  sourceQuote: string | null;
  status: string; // pending | approved
  postId: string | null;
};

// Founder-facing lane labels (his words), keyed by pillar slug.
const BUCKET_LABEL: Record<Pillar, string> = {
  company: "Agency Updates",
  experiment: "Experiments",
  design: "Design",
};

const SOURCES: { key: IdeaSource; label: string }[] = [
  { key: "braindump", label: "🧠 Brain-dump" },
  { key: "tldv", label: "🎙️ tl;dv transcript" },
];

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 140,
  padding: 12,
  border: "2px solid var(--border)",
  borderRadius: 8,
  background: "var(--panel)",
  color: "var(--text)",
  font: "inherit",
  resize: "vertical",
};

export default function IdeasPage() {
  const [source, setSource] = useState<IdeaSource>("braindump");
  const [text, setText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [items, setItems] = useState<Idea[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(0);

  // Inline edit state (edits are saved when the founder clicks Approve).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAngle, setEditAngle] = useState("");
  const [editBucket, setEditBucket] = useState<Pillar>("company");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ideas");
      const data = await res.json();
      setItems(Array.isArray(data.ideas) ? data.ideas : []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function extract() {
    if (extracting || text.trim().length < 20) return;
    setExtracting(true);
    setNote(null);
    try {
      const res = await fetch("/api/ideas/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Extraction failed.");
      } else {
        if (data.note) setNote(data.note);
        if (Array.isArray(data.ideas) && data.ideas.length) setText("");
        await load();
      }
    } catch {
      setNote("Network error — try again.");
    } finally {
      setExtracting(false);
    }
  }

  async function decide(
    idea: Idea,
    action: "approve" | "reject",
    edited?: { angle: string; bucket: Pillar }
  ) {
    if (busyId) return;
    setBusyId(idea.id);
    try {
      await fetch("/api/ideas/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: idea.id,
          action,
          editedAngle: edited?.angle,
          editedBucket: edited?.bucket,
        }),
      });
      setEditingId(null);
      await load();
    } catch {
      // leave state intact for retry
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(idea: Idea) {
    setEditingId(idea.id);
    setEditAngle(idea.angle);
    setEditBucket(idea.bucket);
  }

  const approvedIds = (items ?? [])
    .filter((i) => i.status === "approved" && !i.postId)
    .map((i) => i.id);

  async function draftApproved() {
    if (drafting || !approvedIds.length) return;
    setDrafting(true);
    try {
      const res = await fetch("/api/ideas/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaIds: approvedIds }),
      });
      const data = await res.json();
      if (res.ok) setDrafted((n) => n + (data.drafted ?? 0));
      await load();
    } catch {
      // retryable
    } finally {
      setDrafting(false);
    }
  }

  return (
    <main className="wrap">
      <header>
        <span className="accent-label">idea inbox</span>
        <h1>Ideas</h1>
        <p className="sub">
          Paste a brain-dump or a tl;dv call transcript. The agent mines postable
          ideas, sorts them into your buckets, and quotes the source line so
          nothing&apos;s invented. Approve the good ones — drafting (and the model
          spend) only happens when you hit “Draft”.
        </p>
      </header>

      {/* ── Source intake ── */}
      <div className="mode-bar">
        {SOURCES.map((s) => (
          <button
            key={s.key}
            className={`mode-btn${source === s.key ? " active" : ""}`}
            onClick={() => setSource(s.key)}
            disabled={extracting}
          >
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        style={textareaStyle}
        placeholder={
          source === "tldv"
            ? "Paste the tl;dv transcript / summary of a meeting…"
            : "Dump your raw notes, decisions, results, half-formed ideas…"
        }
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={extracting}
      />

      <div className="game-actions" style={{ marginTop: 12 }}>
        <button
          className="btn"
          onClick={extract}
          disabled={extracting || text.trim().length < 20}
        >
          {extracting ? "Mining ideas…" : "Extract ideas"}
        </button>
        {note && (
          <span className="sub" style={{ margin: 0 }}>
            {note}
          </span>
        )}
      </div>

      {drafted > 0 && (
        <p className="sub" style={{ marginTop: 12 }}>
          ✓ Sent {drafted} idea{drafted !== 1 ? "s" : ""} for writing.{" "}
          <a href="/review">Open review →</a>
        </p>
      )}

      {/* ── Queue ── */}
      <div style={{ marginTop: 24 }}>
        {!items ? (
          <p className="sub">Loading queue…</p>
        ) : items.length === 0 ? (
          <div className="review-empty">
            No ideas yet. Paste something above and hit Extract.
          </div>
        ) : (
          PILLAR_ORDER.map((bucket) => {
            const lane = items.filter((i) => i.bucket === bucket);
            if (!lane.length) return null;
            return (
              <section key={bucket} style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 15, margin: "0 0 10px" }}>
                  {PILLAR_META[bucket].emoji} {BUCKET_LABEL[bucket]}{" "}
                  <span className="sub" style={{ margin: 0 }}>
                    ({lane.length})
                  </span>
                </h2>
                {lane.map((idea) => (
                  <SeedCard
                    key={idea.id}
                    idea={idea}
                    busy={busyId === idea.id}
                    editing={editingId === idea.id}
                    editAngle={editAngle}
                    editBucket={editBucket}
                    onEditAngle={setEditAngle}
                    onEditBucket={setEditBucket}
                    onStartEdit={() => startEdit(idea)}
                    onCancelEdit={() => setEditingId(null)}
                    onApprove={(edited) => decide(idea, "approve", edited)}
                    onReject={() => decide(idea, "reject")}
                  />
                ))}
              </section>
            );
          })
        )}
      </div>

      {/* ── Draft bar ── */}
      {approvedIds.length > 0 && (
        <div className="game-actions" style={{ marginTop: 16 }}>
          <button className="btn" onClick={draftApproved} disabled={drafting}>
            {drafting
              ? "Drafting…"
              : `Draft ${approvedIds.length} approved → Review`}
          </button>
          <span className="sub" style={{ margin: 0 }}>
            This is the only step that spends the writing model.
          </span>
        </div>
      )}
    </main>
  );
}

function SeedCard({
  idea,
  busy,
  editing,
  editAngle,
  editBucket,
  onEditAngle,
  onEditBucket,
  onStartEdit,
  onCancelEdit,
  onApprove,
  onReject,
}: {
  idea: Idea;
  busy: boolean;
  editing: boolean;
  editAngle: string;
  editBucket: Pillar;
  onEditAngle: (v: string) => void;
  onEditBucket: (v: Pillar) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onApprove: (edited?: { angle: string; bucket: Pillar }) => void;
  onReject: () => void;
}) {
  const approved = idea.status === "approved";
  return (
    <div className="card" style={{ marginBottom: 10, opacity: approved ? 0.7 : 1 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          alignItems: "baseline",
        }}
      >
        <strong style={{ fontSize: 14 }}>{idea.seed}</strong>
        <span className="sub" style={{ margin: 0, whiteSpace: "nowrap" }}>
          {approved ? "✓ approved" : `conf ${idea.confidence ?? "–"}`}
        </span>
      </div>

      {editing ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            style={{ ...textareaStyle, minHeight: 80 }}
            value={editAngle}
            onChange={(e) => onEditAngle(e.target.value)}
            disabled={busy}
          />
          <div className="mode-bar" style={{ marginTop: 8 }}>
            {PILLAR_ORDER.map((p) => (
              <button
                key={p}
                className={`mode-btn${editBucket === p ? " active" : ""}`}
                onClick={() => onEditBucket(p)}
                disabled={busy}
              >
                {PILLAR_META[p].emoji} {BUCKET_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: "6px 0 0", fontSize: 14 }}>{idea.angle}</p>
          {idea.sourceQuote && (
            <p
              className="sub"
              style={{ margin: "6px 0 0", fontStyle: "italic" }}
            >
              “{idea.sourceQuote}”
            </p>
          )}
        </>
      )}

      <div className="game-actions" style={{ marginTop: 10 }}>
        {editing ? (
          <>
            <button
              className="btn"
              onClick={() => onApprove({ angle: editAngle, bucket: editBucket })}
              disabled={busy || !editAngle.trim()}
            >
              {busy ? "Saving…" : "Approve edited"}
            </button>
            <button className="btn-ghost" onClick={onCancelEdit} disabled={busy}>
              Cancel
            </button>
          </>
        ) : approved ? (
          <button className="btn-ghost" onClick={onReject} disabled={busy}>
            {busy ? "…" : "Remove"}
          </button>
        ) : (
          <>
            <button className="btn" onClick={() => onApprove()} disabled={busy}>
              {busy ? "…" : "Approve"}
            </button>
            <button className="btn-ghost" onClick={onStartEdit} disabled={busy}>
              ✎ Edit
            </button>
            <button className="btn-ghost" onClick={onReject} disabled={busy}>
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}
