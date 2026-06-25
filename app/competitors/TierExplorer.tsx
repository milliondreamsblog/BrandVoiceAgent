"use client";

// Left-side tier accordion (single-open) → click an agency → modal with their
// best tracked post(s) in a twitter card. Reuses the app's .modal-* + .tweet-card
// styles. The 42-agency follow-list lives here so the page stays scannable.
import { useEffect, useMemo, useState } from "react";
import {
  TIER_LABEL,
  postScore,
  type BestPost,
  type FollowAgency,
  type Tier,
} from "../../lib/competitorData";
import PostCard from "./PostCard";

const ACTIVITY_DOT: Record<string, string> = {
  active: "🟢",
  light: "🟡",
  quiet: "🟡",
  unverified: "⚪",
};

export default function TierExplorer({
  agencies,
  bestPosts,
  tiers,
}: {
  agencies: FollowAgency[];
  bestPosts: BestPost[];
  tiers: Tier[];
}) {
  const [openTier, setOpenTier] = useState<Tier | null>(tiers[0] ?? null);
  const [selected, setSelected] = useState<FollowAgency | null>(null);

  // handle (lowercased) → that agency's tracked posts, best-first
  const postsByHandle = useMemo(() => {
    const m = new Map<string, BestPost[]>();
    for (const p of bestPosts) {
      const k = p.handle.toLowerCase();
      (m.get(k) ?? m.set(k, []).get(k)!).push(p);
    }
    for (const arr of m.values()) arr.sort((a, b) => postScore(b) - postScore(a));
    return m;
  }, [bestPosts]);

  const selectedPosts =
    selected?.xHandle ? postsByHandle.get(selected.xHandle.toLowerCase()) ?? [] : [];

  // Esc closes the modal
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return (
    <div className="follow-split">
      {/* ── left: tier accordion ── */}
      <div className="tier-acc">
        {tiers.map((tier) => {
          const list = agencies.filter((a) => a.tier === tier);
          if (!list.length) return null;
          const open = openTier === tier;
          return (
            <div className={`tier-group${open ? " open" : ""}`} key={tier}>
              <button
                type="button"
                className={`tier-head${open ? " open" : ""}`}
                onClick={() => setOpenTier(open ? null : tier)}
                aria-expanded={open}
              >
                <span>
                  Tier {tier} <span className="tier-count">· {list.length}</span>
                </span>
                <span className="tier-caret">{open ? "▾" : "▸"}</span>
              </button>
              {open && (
                <div className="tier-body">
                  <p className="tier-desc">{TIER_LABEL[tier]}</p>
                  {list.map((a) => {
                    const hasPost =
                      !!a.xHandle && postsByHandle.has(a.xHandle.toLowerCase());
                    return (
                      <button
                        key={a.name}
                        type="button"
                        className="agency-row"
                        onClick={() => setSelected(a)}
                      >
                        <span className="agency-dot">{ACTIVITY_DOT[a.xActivity]}</span>
                        <span className="agency-name">{a.name}</span>
                        {hasPost && <span className="agency-has-post">post</span>}
                        {a.discovered && <span className="agency-tag">disc</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── right: how-to-read helper ── */}
      <aside className="follow-help">
        <p>
          <strong>How to use this.</strong> Open a tier, click any agency to see their
          best-performing post and follow links.
        </p>
        <p>
          <strong>Tiers</strong> rank how strongly they target YC / funded startups —
          Bricx&apos;s exact clients. Tier&nbsp;1 explicitly say &ldquo;for YC&rdquo;;
          Tier&nbsp;4 qualifies but is a weaker fit.
        </p>
        <p>
          🟢 active on X · 🟡 light / quiet · ⚪ X unverified. A{" "}
          <span className="agency-has-post">post</span> tag means we&apos;ve tracked a
          winning post — click to see it.
        </p>
      </aside>

      {/* ── modal: agency detail + best post(s) ── */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-head">
              <div>
                <h3 className="modal-title">{selected.name}</h3>
                <span className="sub" style={{ margin: 0, display: "block" }}>
                  {TIER_LABEL[selected.tier]}
                </span>
              </div>
              <button className="modal-x" type="button" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
            </div>

            <p style={{ fontSize: 13, margin: "0 0 12px", lineHeight: 1.55 }}>{selected.evidence}</p>

            <div className="row" style={{ marginTop: 0, marginBottom: 16, flexWrap: "wrap" }}>
              {selected.xHandle ? (
                <a className="btn-ghost" href={`https://x.com/${selected.xHandle}`} target="_blank" rel="noreferrer">
                  𝕏 Follow @{selected.xHandle}
                </a>
              ) : (
                <span className="sub" style={{ margin: 0 }}>𝕏 {selected.xLabel ?? "no X"}</span>
              )}
              <a className="btn-ghost" href={selected.linkedin} target="_blank" rel="noreferrer">
                in LinkedIn
              </a>
              <a className="btn-ghost" href={`https://${selected.site}`} target="_blank" rel="noreferrer">
                {selected.site} ↗
              </a>
            </div>

            {selectedPosts.length > 0 ? (
              <>
                <p className="comp-modal-label">
                  Best tracked post{selectedPosts.length > 1 ? `s (${selectedPosts.length})` : ""}
                </p>
                <div className="comp-ranked">
                  {selectedPosts.map((p, i) => (
                    <PostCard key={p.url} post={p} rank={selectedPosts.length > 1 ? i + 1 : undefined} showWhy />
                  ))}
                </div>
              </>
            ) : (
              <div className="review-empty" style={{ minHeight: 90, marginTop: 0 }}>
                No post tracked yet — their best post gets added once we track this account.
                Follow them above to watch.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
