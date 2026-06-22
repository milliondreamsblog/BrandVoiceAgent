"use client";

import { useState } from "react";
import TweetCard from "./components/TweetCard";

type Severity = "blocking" | "minor";
type Verdict = "on-voice" | "needs-work" | "off-voice";
interface Working { quote: string; note: string; }
interface Finding { rule: string; severity: Severity; quote: string; why: string; fix: string; }
interface Rewrite { label: "A" | "B" | "C"; text: string; rationale: string; }
interface Critique { verdict: Verdict; working: Working[]; findings: Finding[]; rewrites: Rewrite[]; }

export default function Home() {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Critique | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setResult(data as Critique);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <header>
        <span className="accent-label">voice critic</span>
        <h1>Bricx Voice Critic</h1>
        <p className="sub">Paste a draft. Get it judged against the voice rules, with a minimal in-voice rewrite.</p>
      </header>

      <div className="critic-split">
        {/* ── LEFT: input ── */}
        <div className="critic-input-col">
          <textarea
            className="draft"
            placeholder="Paste a post draft here..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
          />
          <div className="row">
            <button className="btn" onClick={run} disabled={loading || !draft.trim()}>
              {loading ? "Judging..." : "Critique"}
            </button>
            <span className="hint">{draft.length} chars</span>
          </div>
          {error && <div className="error">{error}</div>}
        </div>

        {/* ── RIGHT: output ── */}
        <div className="critic-output-col">
          {!result && !loading && (
            <div className="result-empty">Results appear here after critiquing</div>
          )}
          {loading && (
            <div className="result-empty">Judging...</div>
          )}

          {result && (
            <section className="result">
              <div className={`verdict v-${result.verdict}`}>{result.verdict.replace("-", " ")}</div>

              {result.working.length > 0 && (
                <div className="card">
                  <h2>What&apos;s working</h2>
                  <ul>
                    {result.working.map((w, i) => (
                      <li key={i}>
                        <span className="quote">&ldquo;{w.quote}&rdquo;</span>
                        <span className="note">{w.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="card">
                <h2>Findings ({result.findings.length})</h2>
                {result.findings.length === 0 ? (
                  <p className="muted">No rule violations found.</p>
                ) : (
                  <ul className="findings">
                    {result.findings.map((f, i) => (
                      <li key={i} className={`finding s-${f.severity}`}>
                        <div className="fhead">
                          <span className="rule">{f.rule}</span>
                          <span className={`sev s-${f.severity}`}>{f.severity}</span>
                        </div>
                        <div className="quote">&ldquo;{f.quote}&rdquo;</div>
                        <div className="why">{f.why}</div>
                        <div className="fix"><strong>Fix:</strong> {f.fix}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="card">
                <h2>Rewrites</h2>
                <div className="rewrites">
                  {result.rewrites.map((r, i) => (
                    <div key={r.label} className="rewrite-option">
                      <div className="rewrite-option-head">
                        <span className="rewrite-label">{r.label}</span>
                        <span className="rewrite-rationale">{r.rationale}</span>
                      </div>
                      <TweetCard text={r.text} idx={i} />
                      <div className="rewrite-option-footer">
                        <button
                          className="btn-ghost"
                          onClick={() => {
                            setDraft(r.text);
                            setResult(null);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Use this ↑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
