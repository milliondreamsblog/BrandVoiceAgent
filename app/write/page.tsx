"use client";
import { useState } from "react";
import ComposeDialog from "../components/ComposeDialog";

export default function WritePage() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(0);

  return (
    <main className="wrap">
      <header>
        <span className="accent-label">writer&apos;s desk</span>
        <h1>Write &amp; Send for Review</h1>
        <p className="sub">
          Draft your posts the way you&apos;d publish them — text, photos, video.
          The loop writes three on-voice versions; Divij picks.
        </p>
      </header>

      <div className="write-cta">
        <button className="btn write-cta-btn" onClick={() => setOpen(true)}>
          ✎ New post
        </button>
        {sent > 0 && (
          <p className="write-sent">
            ✓ Sent {sent} batch{sent !== 1 ? "es" : ""} to the review queue.{" "}
            <a href="/review">Open review →</a>
          </p>
        )}
      </div>

      {open && (
        <ComposeDialog
          onClose={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            setSent((n) => n + 1);
          }}
        />
      )}
    </main>
  );
}
