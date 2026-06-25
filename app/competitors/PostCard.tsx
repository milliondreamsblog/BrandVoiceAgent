// A real competitor tweet rendered in the app's twitter-card style, with a rank
// badge (🥇🥈🥉 / #n) and the "why it worked" read. Pure/presentational so it can
// render in both the server page (ranked list) and the client modal (per agency).
import type { BestPost } from "../../lib/competitorData";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]).join("");
  return (letters || name.slice(0, 2)).toUpperCase();
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Compact big numbers so the action row fits in a narrow grid box (45,779 → 45.8K).
function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const RANK_EMOJI: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function PostCard({
  post,
  rank,
  showWhy = true,
}: {
  post: BestPost;
  rank?: number;
  showWhy?: boolean;
}) {
  return (
    <div className="tweet-card comp-post">
      {rank != null && (
        <span className={`rank-badge rank-${rank <= 3 ? rank : "n"}`} aria-label={`rank ${rank}`}>
          {RANK_EMOJI[rank] ?? `#${rank}`}
        </span>
      )}

      <div className="tweet-header">
        <div className="tweet-avatar">{initials(post.agency)}</div>
        <div className="tweet-meta">
          <span className="tweet-name">{post.agency}</span>
          <span className="tweet-handle">
            @{post.handle} · {fmtDate(post.date)}
          </span>
        </div>
        <svg className="tweet-x-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      <div className="tweet-body">{post.text}</div>

      <hr className="tweet-divider" />

      <div className="tweet-actions">
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {post.replies}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          {post.reposts}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {compact(post.likes)}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
          {post.bookmarks}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {compact(post.views)}
        </span>
      </div>

      {showWhy && (
        <p className="comp-why">
          <strong>Why it worked / Bricx angle:</strong> {post.why}
        </p>
      )}
      <a className="comp-viewx" href={post.url} target="_blank" rel="noreferrer">
        view on X →
      </a>
    </div>
  );
}
