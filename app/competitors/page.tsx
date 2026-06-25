// Competitor view — agencies that target YC / funded startups (Bricx's direct
// competition). Top: best competitor posts ranked with badges. Then a tier
// accordion → click an agency → modal with their best post. Read-only, no DB /
// no model calls; renders the snapshot in lib/competitorData.ts. Superseded by
// the System B trend tables once built.
import { COMPETITOR_DATA, postScore, type Tier } from "../../lib/competitorData";
import PostCard from "./PostCard";
import TierExplorer from "./TierExplorer";

export default function CompetitorsPage() {
  const d = COMPETITOR_DATA;
  const tiers: Tier[] = [1, 2, 3, 4];
  const rankedPosts = [...d.bestPosts].sort((a, b) => postScore(b) - postScore(a));

  return (
    <main className="wrap">
      <header>
        <span className="accent-label">what&apos;s working in our circle</span>
        <h1>Competitors</h1>
      </header>

      {/* ── Top performing posts, ranked ── */}
      <h2 className="section-title">🏆 Top performing posts — ranked</h2>
      <p className="sub" style={{ marginTop: 2 }}>
        The competitor posts pulling the most engagement, best first. {rankedPosts.length}{" "}
        tracked so far — ranked by likes + reposts + replies + bookmarks. (More fill in as
        we track accounts live.)
      </p>
      <div className="comp-grid" style={{ marginTop: 18, marginBottom: 32 }}>
        {rankedPosts.map((p, i) => (
          <PostCard key={p.url} post={p} rank={i + 1} />
        ))}
      </div>

      {/* ── Winning patterns (the "why") ── */}
      <h2 className="section-title">📈 Patterns that are winning — the playbook</h2>
      <p className="sub" style={{ marginTop: 2 }}>
        The simple version: what&apos;s working for competitors, why, and what to do about it.
      </p>
      <div className="comp-grid" style={{ marginTop: 18, marginBottom: 32 }}>
        {d.winningPatterns.map((p, i) => (
          <div className="card" key={i}>
            <strong style={{ fontSize: 14 }}>
              {i + 1}. {p.name}
            </strong>
            <p style={{ margin: "6px 0 4px", fontSize: 13 }}>{p.whatItIs}</p>
            <p className="sub" style={{ margin: "0 0 4px" }}>
              <strong>Why it works:</strong> {p.whyItWorks}
            </p>
            <p style={{ margin: "0 0 4px", fontSize: 13 }}>
              <strong>✅ What Bricx does:</strong> {p.doThis}
            </p>
            <span className="sub seen-in" style={{ margin: 0 }}>Seen in: {p.seenIn}</span>
          </div>
        ))}
      </div>

      {/* ── Follow-list: tier accordion + agency modal ── */}
      <h2 className="section-title">Follow-list — agencies that target YC / funded startups</h2>
      <p className="sub" style={{ marginTop: 2 }}>
        {d.agencies.length} agencies that compete for Bricx&apos;s exact clients. Open a tier,
        click an agency to see their best post.
      </p>
      <div style={{ marginTop: 14, marginBottom: 32 }}>
        <TierExplorer agencies={d.agencies} bestPosts={d.bestPosts} tiers={tiers} />
      </div>

      {/* ── Dropped ── */}
      <h2 className="section-title" style={{ fontSize: 15 }}>
        Dropped — no YC / funded evidence
      </h2>
      <div className="card" style={{ marginTop: 10, marginBottom: 28 }}>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
          {d.dropped.map((x) => (
            <li key={x.name} style={{ marginBottom: 6 }}>
              <strong>{x.name}</strong>{" "}
              <span className="sub" style={{ margin: 0 }}>({x.site})</span> — {x.reason}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Takeaways ── */}
      <h2 className="section-title" style={{ fontSize: 15 }}>Takeaways</h2>
      <ul className="sub" style={{ margin: "10px 0 0", paddingLeft: 18 }}>
        {d.takeaways.map((t, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            {t}
          </li>
        ))}
      </ul>
    </main>
  );
}
