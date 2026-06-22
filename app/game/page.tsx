"use client";
import { useState, useEffect } from "react";
import TweetCard from "../components/TweetCard";

const PAIRS = [
  {
    id: "agency-1",
    label: "Ghost Lead",
    before: `Our best lead this month came from someone we've never met.\nA founder reached out this week, referred by a famous VC firm. We've never worked with them. Never pitched them. No relationship, no ask.\nSomeone inside saw our work and sent a founder their way.\nHe told us on the first call. Said he was told we were the only agency worth talking to for this.\nWe didn't see that coming. But whoever made that call, thank you.`,
    after: `A founder booked a call this week, and partway through we realized we had no idea how he'd found us.\n\nA ghost lead?\n\nTurned out someone inside a well-known VC firm had seen our work and sent him our way. We'd never worked with them or even spoken to them.\n\nWhat got us in the room was a sentence he'd been told before reaching out: we were the only agency worth talking to for this.\n\nWe didn't see it coming. Whoever made that call, thank you.`,
    notes: `Opens on the moment of discovery, not the outcome. "A ghost lead?" is a genuine reaction (Rule 10), not manufactured drama. Drops "Our best lead this month" — that's a summary that reveals the ending before the story starts (Rule 18).`,
  },
  {
    id: "agency-2",
    label: "Smallest Portfolio",
    before: `We won a new client this week.\nThey'd spoken to three other agencies before us. We didn't have the biggest portfolio in the room.\nWe had a point of view on their product and a date we'd commit to.\nThat's what closed it. Turned out most agencies gave them options and maybes. A real opinion and a real timeline is rarer than it should be.`,
    after: `We had the smallest portfolio in the room. We still won the account.\n\nThe founder had already met three other agencies, all with more work in their industry to show than we had. On paper we were the weakest option.\n\nWhat we brought instead was a clear point of view on his product and a date we'd commit to.\n\nEveryone else had handed him options and maybe's. Nobody had just told him what they'd do and by when.\n\nTurns out a real opinion and a real deadline are rarer than they should be.`,
    notes: `Opens with the contradiction compressed into two sentences (Rule 18). "On paper we were the weakest option" is more honest and specific than "didn't have the biggest portfolio" (Rule 5). Cuts "That's what closed it" — announcing the lesson instead of letting the reader reach it (Rule 2).`,
  },
  {
    id: "agency-3",
    label: "Rooms We'll Never See",
    before: `We've never run a paid ad.\nOur last three clients found us through a YC forum, a Slack community, and a VC referral.\nWe didn't plan it that way. That's just where the right founders are.`,
    after: `People we've never met are sharing our website in rooms we'll never see.\n\nWe keep finding out after the fact. A founder books a call, and somewhere in it he mentions a YC forum thread, or a Slack channel we're not in, or a name who passed us along.\n\nOur last three clients all came in this way, from places we didn't know were talking about us.\n\nYou can't buy that, and we didn't. The work just started traveling without us.`,
    notes: `Hook pivots from a flat fact ("never run a paid ad") to the emotional truth: "rooms we'll never see" (Rule 19). "The work just started traveling without us" names the feeling without stating the lesson — the reader concludes it themselves (Rule 2).`,
  },
  {
    id: "agency-4",
    label: "Design Engineer",
    before: `Our clients kept asking if we do front-end dev.\nThen motion. Then animation. Then product videos.\nWe kept saying no and referring them out. Last week we hired a design engineer.\nWe're not saying no anymore. When clients keep asking for the same thing, that's usually a sign.`,
    after: `Our clients bullied us to hire a design engineer at Bricx.\n\nThey'd been asking for front-end dev, motion, animation, product videos. For months we said no and sent them elsewhere.\n\nAt some point the same request coming back over and over stops being a coincidence. So we hired for it.\n\nWe're not referring this work out anymore.`,
    notes: `"Bullied us" is one unexpected but accurate word that replaces an entire setup paragraph (Rule 19). Cuts "When clients keep asking for the same thing, that's usually a sign" — that's telling the reader the lesson (Rule 2). Ends on the fact, not an editorial.`,
  },
  {
    id: "agency-5",
    label: "PM Is Breaking",
    before: `Honest update: our project management is breaking.\nMe and @Divij are still running individual client projects ourselves. Too much living in too few heads.\nWe're growing faster than our processes can handle right now.\nUncomfortable to admit. Necessary to fix. Working on it this month.`,
    after: `Right now, @RakhraDivij and I are personally running client projects. That stopped being sustainable a while ago.\n\nToo much of how this agency runs lives in two people's heads. The work itself is good. Keeping it good is taking more out of the two of us than it should.\n\nWe're growing, which is the reason this is happening. Growth has outrun the systems we built for a smaller version of us.\n\nSo the next few weeks go to fixing it. Clearer ownership on each project, and far less routed through the two of us.\n\nThis isn't the most comfortable update to post. But it's true. We're already on it.`,
    notes: `Drops "Honest update:" and "Uncomfortable to admit. Necessary to fix." — both label the emotion instead of demonstrating it (Rule 17). Opens on the specific fact, not the category name. "Growth has outrun the systems we built for a smaller version of us" is more concrete than "growing faster than our processes can handle" (Rule 5).`,
  },
  {
    id: "agency-6",
    label: "Our Own Website",
    before: `A new Bricx Labs website is coming.\nWe've designed 50+ websites for AI and B2B SaaS startups.\nOurs has been embarrassingly last on the list.\nThat changes this quarter, will share updates as we build.`,
    after: `The hardest website we've had to start is our own.\n\nWe've done 50+ for AI and B2B SaaS startups without blinking. Ours kept sliding down the list, partly because client work always won, partly because designing for yourself is its own kind of hard.\n\nWe're starting this week anyway. Updates as we build.`,
    notes: `Leads with the contradiction: "hardest website... is our own" (Rule 18). "Without blinking" is a real feeling that sharpens the contrast with "its own kind of hard." "Ours has been embarrassingly last" performs self-deprecation; "kept sliding down the list" is more honest.`,
  },
  {
    id: "agency-8",
    label: "$3B Client",
    before: `The $400M client that never converted.\n\n[Reference note — no full draft was written for this one.]`,
    after: `A VP of Brand messaged us on WhatsApp five minutes after finding us. His company is valued at $3 billion.\n\nHe'd searched for the best UX agencies in Silicon Valley. We came up first. Next thing, he's on WhatsApp asking to hop on a call, and minutes later we're actually on it.\n\nIt didn't close. Doesn't matter. A company that size found us through a search ranking and reached out personally within the hour.\n\nThat's the whole pitch for AEO, in one slightly absurd afternoon.`,
    notes: `Opens on two specific details in the first sentence: WhatsApp and five minutes (Rule 19). "$3 billion" follows immediately — the number is the hook. "In one slightly absurd afternoon" is real emotion tied to a real moment (Rule 4). Never states "this proves AEO works" — the reader concludes it (Rule 2).`,
  },
  {
    id: "experiments-7",
    label: "Design Twitter",
    before: `Half of design twitter has strong opinions and a weak portfolio.\nHaving a take isn't the same as having taste.\nThe designers who can actually ship - inside real companies, with real constraints, real users, real pressure, are quieter online than you'd expect.\nPosting about design and doing design are two very different skills.`,
    after: `Strong opinions, weak portfolio.\n\nIt's the most common combination in design twitter.\n\nThe correlation almost runs backwards. The sharper someone's hot takes, the thinner the body of work behind them tends to be. The ones who can actually do it are off doing it, not narrating it.\n\nPosting about design and doing design are different skills, and the internet rewards the wrong one.`,
    notes: `Hook compressed to 4 words vs a full sentence — contradiction at its sharpest (Rule 18). "The correlation almost runs backwards" is a specific, unexpected insight not in the original. "Off doing it, not narrating it" cuts the comma-triplet from the original (Rule 11) and replaces it with a single precise observation.`,
  },
];

type Mode = "pick" | "spot";

export default function GamePage() {
  const [mode, setMode] = useState<Mode>("pick");
  const [idx, setIdx] = useState(0);
  const [answered, setAnswered] = useState<"a" | "b" | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [placements, setPlacements] = useState<boolean[] | null>(null);

  useEffect(() => {
    setPlacements(PAIRS.map(() => Math.random() > 0.5));
  }, []);

  if (!placements) return null;

  const pair = PAIRS[idx];
  const divijOnA = placements[idx];
  const textA = divijOnA ? pair.after : pair.before;
  const textB = divijOnA ? pair.before : pair.after;
  const aIsCorrect = divijOnA;
  const bIsCorrect = !divijOnA;

  function pick(side: "a" | "b") {
    if (answered) return;
    setAnswered(side);
    const pickedCorrect = side === "a" ? aIsCorrect : bIsCorrect;
    if (pickedCorrect) setScore((s) => s + 1);
  }

  function cardState(side: "a" | "b"): "correct" | "wrong" | "revealed" | null {
    const isCorrect = side === "a" ? aIsCorrect : bIsCorrect;
    const wasPicked = answered === side;
    if (!answered) return null;
    if (wasPicked && isCorrect) return "correct";
    if (wasPicked && !isCorrect) return "wrong";
    if (!wasPicked && isCorrect) return "revealed";
    return null;
  }

  function next() {
    if (idx + 1 >= PAIRS.length) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setAnswered(null);
      setRevealed(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setIdx(0);
    setAnswered(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
  }

  function restart() {
    setIdx(0);
    setAnswered(null);
    setRevealed(false);
    setScore(0);
    setDone(false);
    setPlacements(PAIRS.map(() => Math.random() > 0.5));
  }

  if (done) {
    return (
      <main className="wrap">
        <div className="game-score-screen">
          {mode === "pick" ? (
            <>
              <div className="game-score-num">{score}/{PAIRS.length}</div>
              <div className="game-score-label">
                {score === PAIRS.length
                  ? "Clean sweep. You know the voice."
                  : score >= PAIRS.length / 2
                  ? "Solid. Keep going."
                  : "Keep reading the approved pairs."}
              </div>
            </>
          ) : (
            <>
              <div className="game-score-num">{PAIRS.length}</div>
              <div className="game-score-label">Violations reviewed. You&apos;ve seen them all.</div>
            </>
          )}
          <button className="btn" onClick={restart}>Play again</button>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header>
        <span className="accent-label">train your eye</span>
        <h1>Voice Game</h1>
        <p className="sub">Train your eye against real before/after pairs.</p>
      </header>

      <div className="mode-bar">
        <button
          className={`mode-btn${mode === "pick" ? " active" : ""}`}
          onClick={() => switchMode("pick")}
        >
          Pick the better version
        </button>
        <button
          className={`mode-btn${mode === "spot" ? " active" : ""}`}
          onClick={() => switchMode("spot")}
        >
          Spot the violation
        </button>
      </div>

      <div className="game-header">
        <span className="game-progress">
          {idx + 1} / {PAIRS.length} &nbsp;
          <span className="game-pair-label">{pair.label}</span>
        </span>
        {mode === "pick" && <span className="game-score-inline">Score: {score}</span>}
      </div>

      <div className="game-card">
        {mode === "pick" ? (
          <>
            <p className="game-instruction">Which version is more on-voice?</p>
            <div className="pick-grid">
              <TweetCard
                text={textA}
                idx={idx * 2}
                onClick={() => pick("a")}
                state={cardState("a")}
                disabled={!!answered}
              />
              <TweetCard
                text={textB}
                idx={idx * 2 + 1}
                onClick={() => pick("b")}
                state={cardState("b")}
                disabled={!!answered}
              />
            </div>
            {answered && (
              <>
                <div className="game-reveal">
                  <strong>Why the approved version works:</strong> {pair.notes}
                </div>
                <div className="game-actions">
                  <button className="btn" onClick={next}>
                    {idx + 1 < PAIRS.length ? "Next →" : "See score"}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <p className="game-instruction">Read this draft. What rule does it break?</p>
            <TweetCard text={pair.before} idx={idx} />
            {!revealed ? (
              <div className="game-actions">
                <button className="btn-secondary" onClick={() => setRevealed(true)}>
                  Reveal violations
                </button>
              </div>
            ) : (
              <>
                <div className="game-reveal">
                  <strong>What&apos;s wrong:</strong> {pair.notes}
                </div>
                <div className="game-actions">
                  <button className="btn" onClick={next}>
                    {idx + 1 < PAIRS.length ? "Next →" : "Done"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
