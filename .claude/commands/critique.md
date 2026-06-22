# /critique

Run the full Bricx content pipeline on the draft the user just pasted.

## Steps — run in order

### Step 1: Read the specs (if not already in context)
Read these files before judging anything:
- `tone-agent/voice-critic.system.md` — 19 voice rules + calibration anchors
- `tone-agent/distribution.md` — format, media, hook variant, next angle spec

### Step 2: Voice critic
Apply the voice rules to the draft. For each rule 1–19, scan for violations.
Respect all carve-outs (Rule 10 honest reactions, Rule 1 headline "I", etc.).
Surface what is working (1–3 lines).

### Step 3: Three rewrites
Produce exactly three rewrites calibrated to the approved voice register from the calibration pairs:
- **A — Minimal fix**: resolve blocking findings only. Nothing else changes.
- **B — Reangled**: same story, different hook or angle. Different door, same destination.
- **C — Sharpest**: cut every line doing rhythm instead of carrying information.

Each rewrite gets a one-sentence rationale.

### Step 4: Distribution
Apply `distribution.md` to the best rewrite:
- Format: `single-tweet` | `thread` | `carousel-caption`
- Media: what visual this needs (or "standalone")
- Hook 1 + Hook 2: alternate openers using entry shapes not already in A/B/C
- Next angle: the adjacent story this post sets up, concrete enough to write from

## Output format

Print exactly this structure:

---
**VERDICT** `on-voice` | `needs-work` | `off-voice`

**WORKING**
- "[quote]" — [rule it exemplifies]

**FINDINGS**
- [Rule N] [blocking|minor] — "[quote]" → [fix]

---
**REWRITE A** *(minimal fix)*
[text]
*[rationale]*

**REWRITE B** *(reangled)*
[text]
*[rationale]*

**REWRITE C** *(sharpest)*
[text]
*[rationale]*

---
**FORMAT** [single-tweet | thread | carousel-caption]
**MEDIA** [what visual it needs]
**HOOK 1** [alternate opener]
**HOOK 2** [alternate opener]
**NEXT ANGLE** [the adjacent story this sets up]

---

## After output

Ask: "Push A/B/C to review queue?"
If yes: POST to `https://tone-app-phi.vercel.app/api/drafts` with `source: "chat"`, `original: <draft>`, `versions: [{label, text, rationale}]` using curl via Bash tool.
