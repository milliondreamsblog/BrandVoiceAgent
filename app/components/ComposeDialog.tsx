"use client";
import { useRef, useState } from "react";
import TweetCard, { type TweetMedia } from "./TweetCard";
import {
  PILLAR_ORDER,
  PILLAR_META,
  DEFAULT_PILLAR,
  type Pillar,
} from "../../lib/pillars";

interface DraftPost {
  body: string;
  media: TweetMedia[];
  pillar: Pillar;
}

const blank = (): DraftPost => ({ body: "", media: [], pillar: DEFAULT_PILLAR });

const MAX_SOURCE_BYTES = 25 * 1024 * 1024; // reject absurd source files before decoding

// No external bucket needed: downscale the image in the browser and inline it as
// a compact data URL, which we store straight in the post's media. It lives in
// Neon with everything else — zero new infra, no card, works in dev and on Vercel.
async function imageToDataUrl(
  file: File,
  maxDim = 1280,
  quality = 0.82
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  // Prefer WebP (smaller); fall back to JPEG if the browser ignores the type.
  let url = canvas.toDataURL("image/webp", quality);
  if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/jpeg", quality);
  return url;
}

export default function ComposeDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [items, setItems] = useState<DraftPost[]>([blank()]);
  const [idx, setIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const current = items[idx];

  function patch(partial: Partial<DraftPost>) {
    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, ...partial } : p)));
  }

  function clearInputs() {
    if (photoRef.current) photoRef.current.value = "";
    if (videoRef.current) videoRef.current.value = "";
  }

  async function handleFile(file: File | undefined, type: "image" | "video") {
    if (!file) return;
    setError(null);
    if (type === "video") {
      // Video is too heavy to inline in the DB and there's no bucket yet.
      setError("Video needs a storage bucket — images work now. Ask me to wire up Cloudinary (no card) for video.");
      clearInputs();
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError(`That image is ${(file.size / 1024 / 1024).toFixed(0)} MB — pick one under 25 MB.`);
      clearInputs();
      return;
    }
    setUploading(true);
    try {
      const url = await imageToDataUrl(file);
      patch({ media: [...current.media, { type, url }] });
    } catch (e) {
      setError(`Couldn't process that image: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      clearInputs();
    }
  }

  function removeMedia(i: number) {
    patch({ media: current.media.filter((_, j) => j !== i) });
  }

  function addPost() {
    setItems((prev) => [...prev, blank()]);
    setIdx(items.length);
  }

  function removePost(i: number) {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, j) => j !== i));
    setIdx((cur) => Math.max(0, cur > i ? cur - 1 : cur >= items.length - 1 ? items.length - 2 : cur));
  }

  const filled = items.filter((p) => p.body.trim() || p.media.length);

  async function submit() {
    if (!filled.length) {
      setError("Add some text or media first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: filled }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onDone();
    } catch (e) {
      setError(`Submit failed: ${(e as Error).message}`);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal compose-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="accent-label">writer</span>
            <h2 className="modal-title">New post{items.length > 1 ? `s (${items.length})` : ""}</h2>
          </div>
          <button className="modal-x" onClick={onClose} aria-label="Close">×</button>
        </div>

        {/* post pagination */}
        <div className="compose-pager">
          {items.map((_, i) => (
            <button
              key={i}
              className={`page-num${i === idx ? " active" : ""}`}
              onClick={() => setIdx(i)}
            >
              {i + 1}
            </button>
          ))}
          <button className="btn-ghost compose-add" onClick={addPost}>+ Add post</button>
          {items.length > 1 && (
            <button className="btn-ghost compose-remove" onClick={() => removePost(idx)}>
              Remove this
            </button>
          )}
        </div>

        <div className="compose-grid">
          {/* editor */}
          <div className="compose-editor">
            <div className="compose-pillar">
              <span className="compose-pillar-label">Pillar</span>
              <div className="pillar-pills">
                {PILLAR_ORDER.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`pillar-pill${current.pillar === p ? " active" : ""}`}
                    onClick={() => patch({ pillar: p })}
                    title={PILLAR_META[p].label}
                  >
                    {PILLAR_META[p].emoji} {PILLAR_META[p].short}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="draft compose-textarea"
              placeholder="What's the post? Write it the way you'd publish it."
              value={current.body}
              onChange={(e) => patch({ body: e.target.value })}
            />

            {current.media.length > 0 && (
              <div className="compose-attachments">
                {current.media.map((m, i) => (
                  <div key={i} className="compose-chip">
                    <span>{m.type === "video" ? "🎬" : "🖼"} {m.type}</span>
                    <button onClick={() => removeMedia(i)} aria-label="Remove">×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="row compose-tools">
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0], "image")}
              />
              <input
                ref={videoRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                hidden
                onChange={(e) => handleFile(e.target.files?.[0], "video")}
              />
              <button
                className="btn-secondary compose-tool-btn"
                onClick={() => photoRef.current?.click()}
                disabled={uploading}
              >
                🖼 Photo
              </button>
              <button
                className="btn-secondary compose-tool-btn"
                onClick={() => videoRef.current?.click()}
                disabled
                title="Video needs a storage bucket — images work now"
              >
                🎬 Video
              </button>
              {uploading && <span className="hint">Processing…</span>}
            </div>
          </div>

          {/* live preview */}
          <div className="compose-preview">
            <span className="compose-preview-label">Live preview</span>
            <TweetCard
              text={current.body || "Your post will look like this."}
              media={current.media}
              idx={idx}
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="modal-foot">
          <span className="hint">
            {filled.length} post{filled.length !== 1 ? "s" : ""} ready · each gets 3 rewrites
          </span>
          <button className="btn" onClick={submit} disabled={submitting || uploading}>
            {submitting ? "Sending for review…" : "Upload for review ↑"}
          </button>
        </div>
      </div>
    </div>
  );
}
