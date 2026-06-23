"use client";

const ENGAGEMENTS = [
  { replies: 12, retweets: 34, likes: 201, views: "4.2K" },
  { replies: 8,  retweets: 21, likes: 156, views: "3.1K" },
  { replies: 19, retweets: 47, likes: 312, views: "6.8K" },
  { replies: 6,  retweets: 18, likes: 134, views: "2.9K" },
  { replies: 23, retweets: 56, likes: 389, views: "8.1K" },
  { replies: 11, retweets: 29, likes: 178, views: "3.7K" },
  { replies: 15, retweets: 38, likes: 245, views: "5.2K" },
  { replies: 9,  retweets: 22, likes: 167, views: "3.4K" },
  { replies: 14, retweets: 31, likes: 219, views: "4.6K" },
  { replies: 7,  retweets: 16, likes: 112, views: "2.4K" },
  { replies: 18, retweets: 43, likes: 287, views: "5.9K" },
];

export interface TweetMedia {
  type: "image" | "video";
  url: string;
}

interface TweetCardProps {
  text: string;
  idx?: number;
  media?: TweetMedia[];
  onClick?: () => void;
  state?: "correct" | "wrong" | "revealed" | null;
  disabled?: boolean;
  // Neutral selection highlight (brand accent, NOT the green "correct" state).
  selected?: boolean;
  // When present, renders a ↻ "change hook" control that fires without
  // triggering the card's own onClick.
  onRehook?: () => void;
}

export default function TweetCard({ text, idx = 0, media, onClick, state, disabled, selected, onRehook }: TweetCardProps) {
  const eng = ENGAGEMENTS[idx % ENGAGEMENTS.length];
  const isClickable = !!onClick;
  const items = media ?? [];

  const cls = [
    "tweet-card",
    isClickable ? "tweet-card-btn" : "",
    state ? `state-${state}` : "",
    selected ? "tweet-card-selected" : "",
  ].filter(Boolean).join(" ");

  const inner = (
    <>
      <div className="tweet-header">
        <div className="tweet-avatar">B</div>
        <div className="tweet-meta">
          <span className="tweet-name">Bricx Labs</span>
          <span className="tweet-handle">@bricxlabs · 2h</span>
        </div>
        {onRehook && (
          <button
            type="button"
            className="tweet-rehook"
            title="Change hook"
            onClick={(e) => {
              e.stopPropagation();
              onRehook();
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            hook
          </button>
        )}
        <svg className="tweet-x-icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </div>

      {text && <div className="tweet-body">{text}</div>}

      {items.length > 0 && (
        <div className={`tweet-media tweet-media-${Math.min(items.length, 4)}`}>
          {items.map((m, i) =>
            m.type === "video" ? (
              <video key={i} src={m.url} className="tweet-media-item" controls preload="metadata" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={m.url} className="tweet-media-item" alt="" />
            )
          )}
        </div>
      )}

      <hr className="tweet-divider" />

      <div className="tweet-actions">
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {eng.replies}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          {eng.retweets}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {eng.likes}
        </span>
        <span className="tweet-action">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6"  y1="20" x2="6"  y2="14" />
          </svg>
          {eng.views}
        </span>
      </div>
    </>
  );

  if (isClickable) {
    return (
      <button className={cls} type="button" onClick={onClick} disabled={disabled}>
        {inner}
      </button>
    );
  }

  return <div className={cls}>{inner}</div>;
}
