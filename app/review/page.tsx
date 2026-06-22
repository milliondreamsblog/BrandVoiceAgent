"use client";
import { useEffect, useState, useCallback } from "react";
import TweetCard from "../components/TweetCard";
import { Rationale } from "../components/RuleTooltip";

interface Version { label: string; text: string; rationale?: string; }
interface Draft {
  id: string;
  status: "pending" | "approved";
  source: string;
  original: string;
  versions: Version[];
  selected: number | null;
  created_at: string;
}

export default function ReviewPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/drafts");
    setDrafts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function select(draftId: string, versionIdx: number) {
    setSelecting(draftId);
    await fetch("/api/drafts/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draftId, selected: versionIdx }),
    });
    await load();
    setSelecting(null);
  }

  const pending = drafts.filter((d) => d.status === "pending");
  const approved = drafts.filter((d) => d.status === "approved");

  return (
    <main className="wrap">
      <header>
        <div className="review-header-row">
          <div>
            <span className="accent-label">divij&apos;s queue</span>
            <h1>Review Queue</h1>
            <p className="sub">
              Pick the best version. Approved posts become training data.
            </p>
          </div>
          <button className="btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "↺ Refresh"}
          </button>
        </div>
      </header>

      {loading && <div className="result-empty">Loading drafts...</div>}

      {!loading && pending.length === 0 && approved.length === 0 && (
        <div className="result-empty">
          No drafts yet. Push one from chat or use the Critic page.
        </div>
      )}

      {!loading && pending.length > 0 && (
        <section className="lib-section">
          <div className="lib-section-head">
            <h2 className="section-title">Needs a pick</h2>
            <span className="lib-count">{pending.length} draft{pending.length !== 1 ? "s" : ""}</span>
          </div>

          {pending.map((draft, di) => (
            <div key={draft.id} className="review-draft">
              <div className="review-draft-meta">
                <span className="lib-category">
                  {draft.source === "chat" ? "from chat" : "from critic"}
                </span>
                <span className="review-date">
                  {new Date(draft.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>

              <details className="review-original-details">
                <summary className="review-original-summary">
                  Original draft
                </summary>
                <pre className="lib-text lib-text-before">{draft.original}</pre>
              </details>

              <div className="review-versions">
                {(draft.versions ?? []).map((v, i) => (
                  <div key={i} className="review-version">
                    <div className="review-version-label">{v.label}</div>
                    <TweetCard text={v.text} idx={di * 3 + i} />
                    {v.rationale && <Rationale text={v.rationale} />}
                    <button
                      className="btn review-pick-btn"
                      onClick={() => select(draft.id, i)}
                      disabled={selecting === draft.id}
                    >
                      {selecting === draft.id ? "Saving..." : "Pick this one ↑"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {!loading && approved.length > 0 && (
        <section className="lib-section">
          <div className="lib-section-head">
            <h2 className="section-title">Approved</h2>
            <span className="lib-count">{approved.length} posts</span>
          </div>
          <div className="lib-caption-grid">
            {approved.map(
              (d, i) =>
                d.selected !== null && d.versions?.[d.selected] && (
                  <TweetCard
                    key={d.id}
                    text={d.versions[d.selected!].text}
                    idx={20 + i}
                  />
                )
            )}
          </div>
        </section>
      )}
    </main>
  );
}
