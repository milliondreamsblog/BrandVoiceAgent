import React from "react";

const RULES: Record<number, { name: string; summary: string }> = {
  1: {
    name: "Write as 'we' in the body",
    summary: "'I' can open the piece and close it. The body stays 'we' — the work is the team's work.",
  },
  2: {
    name: "Share, don't preach",
    summary: "Report what we did. Don't teach the reader what it means. Cut editorializing that turns into takeaways — the reader draws the lesson.",
  },
  3: {
    name: "Active voice, always",
    summary: "We are the subject. We do the action. Avoid passive forms ('was moved', 'were developed') and actions that happen on their own with no person behind them.",
  },
  4: {
    name: "Write with real emotion",
    summary: "Real emotion is an honest reaction tied to a specific moment. Not 'I was blown away' — but the exact thing that stung or landed.",
  },
  5: {
    name: "Be specific",
    summary: "Name the real constraint. The exact thing the client said. One concrete detail beats ten general claims — specificity is what makes readers believe instead of skim.",
  },
  6: {
    name: "No throat-clearing",
    summary: "State the substance first. No build-up, no openers that delay the point and pretend to be profound. Say the thing.",
  },
  7: {
    name: "No label-then-reveal",
    summary: "Don't announce what's coming before saying it. Drop 'That was the brief:' or 'The part that still surprises me:' — the content stands on its own.",
  },
  8: {
    name: "Periods over commas",
    summary: "When a comma joins two complete thoughts, make it two sentences. If a sentence leans on commas to chain clauses, break it.",
  },
  9: {
    name: "Vary sentence length",
    summary: "Mix medium and short sentences naturally. Also vary how sentences open — active voice doesn't mean every sentence starts with 'We'.",
  },
  10: {
    name: "No manufactured punch",
    summary: "Short fragments that add drama with no content get cut. Honest reactions ('A ghost lead?') are allowed. Repetition that mirrors meaning ('Then motion. Then animation.') is allowed.",
  },
  11: {
    name: "No rule-of-three triplets",
    summary: "Don't chain three parallel phrases with commas for rhythm. If they're one idea, say it once. If distinct, make real bullets.",
  },
  12: {
    name: "Never bash others to position",
    summary: "Don't set up a weak version of how others work to look good by comparison. State what works on its own merits — confidence needs no punching bag.",
  },
  13: {
    name: "Bullets must be actionable",
    summary: "Every bullet earns its place by being specific enough to act on. Vague bullets that restate common sense get cut or made concrete.",
  },
  14: {
    name: "Short paragraphs",
    summary: "Keep paragraphs to one or two sentences. Give the reader white space. A reader should scan top to bottom and follow the arc.",
  },
  15: {
    name: "No em-dashes",
    summary: "Never use em-dashes. Use periods, commas, or colons instead.",
  },
  16: {
    name: "Never invent quotes",
    summary: "A quote attributed to a real person must be their real words or close to it. Never fabricate what a client or partner said in public.",
  },
  17: {
    name: "Never label the emotion",
    summary: "'Honest update:' or 'Uncomfortable to admit.' signals performance, not honesty. Drop the label and say the thing directly.",
  },
  18: {
    name: "Open with the contradiction",
    summary: "If the story has a tension ('smallest portfolio, still won'), compress both sides into the first two sentences. Lead with the paradox, not the outcome.",
  },
  19: {
    name: "Sharpest detail in the hook",
    summary: "The most concrete, surprising detail goes at the top — a WhatsApp message, a five-minute window, a $3B valuation. If the most vivid detail is buried in paragraph 3, move it up.",
  },
};

function parseRationale(text: string): React.ReactNode[] {
  const parts = text.split(/(Rule \d+)/g);
  return parts.map((part, i) => {
    const match = part.match(/^Rule (\d+)$/);
    if (match) {
      const num = parseInt(match[1]);
      const rule = RULES[num];
      if (!rule) return <span key={i}>{part}</span>;
      return (
        <span key={i} className="rule-ref-wrap">
          <span className="rule-ref">{part}</span>
          <span className="rule-tooltip">
            <span className="rule-tooltip-title">Rule {num} — {rule.name}</span>
            <span className="rule-tooltip-body">{rule.summary}</span>
          </span>
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function Rationale({ text }: { text: string }) {
  return <div className="review-rationale">{parseRationale(text)}</div>;
}
