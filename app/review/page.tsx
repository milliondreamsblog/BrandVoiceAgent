"use client";
import { useCallback, useEffect, useState } from "react";
import TweetCard from "../components/TweetCard";
import RewriteCard, { type RewriteData } from "../components/RewriteCard";
import ComposeDialog from "../components/ComposeDialog";
import {
  PILLAR_META,
  PILLAR_FILTER_ORDER,
  pillarFilterMeta,
  type Pillar,
  type PillarFilter,
} from "../../lib/pillars";

interface Reaction {
  id: string;
  rewriteId: string | null;
  type: string;
  payload: string | null;
}
interface Media {
  type: "image" | "video";
  url: string;
}
interface Post {
  id: string;
  body: string;
  media: Media[];
  pillar: Pillar;
  createdAt: string;
  rewrites: RewriteData[];
  reactions: Reaction[];
}

export default function ReviewPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<"pending" | "reviewed">("pending");
  const [pillar, setPillar] = useState<PillarFilter>("all");
  const [loading, setLoading] = useState(true);
  const [compose, setCompose] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/posts?page=${page}&status=${tab}&pillar=${pillar}`
    );
    const data = await res.json();
    setPosts(data.posts ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, tab, pillar]);

  useEffect(() => {
    load();
  }, [load]);

  function switchTab(t: "pending" | "reviewed") {
    setTab(t);
    setPage(1);
  }

  function switchPillar(p: PillarFilter) {
    setPillar(p);
    setPage(1);
  }

  async function deletePost(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/posts?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      setConfirmId(null);
      await load();
    } catch (e) {
      alert(`Couldn't delete this draft: ${(e as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="wrap">
      <header>
        <div className="review-header-row">
          <div>
            <span className="accent-label">divij&apos;s queue</span>
            <h1>Review Queue</h1>
            <p className="sub">
              Like freely. Pick one. Every edit, comment, and pick trains the loop.
            </p>
          </div>
          <button className="btn" onClick={() => setCompose(true)}>
            ✎ New post
          </button>
        </div>

        <div className="mode-bar">
          <button
            className={`mode-btn${tab === "pending" ? " active" : ""}`}
            onClick={() => switchTab("pending")}
          >
            Needs a pick
          </button>
          <button
            className={`mode-btn${tab === "reviewed" ? " active" : ""}`}
            onClick={() => switchTab("reviewed")}
          >
            Reviewed
          </button>

          <div className="pillar-tabs">
            {PILLAR_FILTER_ORDER.map((p) => {
              const m = pillarFilterMeta(p);
              return (
                <button
                  key={p}
                  className={`mode-btn pillar-tab${pillar === p ? " active" : ""}`}
                  onClick={() => switchPillar(p)}
                  title={m.label}
                >
                  {m.emoji} {m.short}
                </button>
              );
            })}
          </div>

          <button className="btn-ghost" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "↺ Refresh"}
          </button>
        </div>
      </header>

      {loading && <div className="review-empty">Loading…</div>}

      {!loading && posts.length === 0 && (
        <div className="review-empty">
          {pillar === "all"
            ? tab === "pending"
              ? "No posts waiting for review. Add one with “New post”."
              : "No reviewed posts yet."
            : tab === "pending"
            ? `No ${PILLAR_META[pillar].short} posts waiting. Tag one with this pillar in “New post”.`
            : `No reviewed ${PILLAR_META[pillar].short} posts yet.`}
        </div>
      )}

      {!loading &&
        posts.map((post, pi) => {
          const pickedId =
            post.reactions.find((r) => r.type === "pick")?.rewriteId ?? null;
          const sorted = [...post.rewrites].sort((a, b) =>
            a.label.localeCompare(b.label)
          );
          return (
            <div key={post.id} className="review-draft">
              <div className="review-draft-meta">
                <span className="lib-category">writer&apos;s draft</span>
                <span className="pillar-badge">
                  {PILLAR_META[post.pillar].emoji} {PILLAR_META[post.pillar].label}
                </span>
                <span className="review-date">
                  {new Date(post.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>

                <div className="review-draft-actions">
                  {confirmId === post.id ? (
                    <span className="delete-confirm">
                      <span className="delete-confirm-q">
                        Delete & remove from training?
                      </span>
                      <button
                        className="del-btn del-yes"
                        disabled={deletingId === post.id}
                        onClick={() => deletePost(post.id)}
                      >
                        {deletingId === post.id ? "Deleting…" : "Yes, delete"}
                      </button>
                      <button
                        className="del-btn del-no"
                        disabled={deletingId === post.id}
                        onClick={() => setConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      className="del-btn del-trash"
                      title="Delete this draft and remove it from the agent's training"
                      onClick={() => setConfirmId(post.id)}
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>
              </div>

              {/* the writer's original, as a real tweet card */}
              <TweetCard text={post.body} media={post.media} idx={pi} />

              <div className="rw-divider">
                <span>3 rewrites from the loop</span>
              </div>

              {sorted.length === 0 && (
                <div className="error">
                  Rewrites didn&apos;t generate for this one. Refresh in a moment.
                </div>
              )}

              <div className="rw-grid">
                {sorted.map((rw, ri) => {
                  const rxn = post.reactions;
                  return (
                    <RewriteCard
                      key={rw.id}
                      rewrite={rw}
                      postId={post.id}
                      media={post.media}
                      idx={pi * 3 + ri}
                      pillar={post.pillar}
                      liked={rxn.some((r) => r.rewriteId === rw.id && r.type === "like")}
                      disapproved={rxn.some(
                        (r) => r.rewriteId === rw.id && r.type === "disapprove"
                      )}
                      edit={
                        rxn.find((r) => r.rewriteId === rw.id && r.type === "edit")
                          ?.payload ?? undefined
                      }
                      comments={rxn
                        .filter((r) => r.rewriteId === rw.id && r.type === "comment")
                        .map((r) => r.payload ?? "")
                        .filter(Boolean)}
                      picked={pickedId === rw.id}
                      anyPicked={pickedId !== null}
                      onAfter={load}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}

      {!loading && pages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`page-num${n === page ? " active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="page-btn"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
          <span className="page-info">
            {total} post{total !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {compose && (
        <ComposeDialog
          onClose={() => setCompose(false)}
          onDone={() => {
            setCompose(false);
            switchTab("pending");
            load();
          }}
        />
      )}
    </main>
  );
}
