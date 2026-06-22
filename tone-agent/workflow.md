# Bricx Content Pipeline — Workflow

Three steps. Run in order. Each step feeds the next.

---

## The three specs

| Step | File | What it does |
|---|---|---|
| 1. Voice | `voice-critic.system.md` | Judges the draft against 19 rules. Surfaces findings. |
| 2. Critic | (same file, output section) | Produces 3 rewrites: A minimal fix, B reangled, C sharpest. |
| 3. Distribution | `distribution.md` | Format, media note, 2 hook variants, next angle. |

---

## How to run it

Paste the raw draft. The pipeline runs all three steps and returns:

```
VERDICT       on-voice | needs-work | off-voice
FINDINGS      [rule violations with severity and fix]
WORKING       [1-3 lines that are already on-voice]

REWRITE A     [minimal fix — blocking findings only]
REWRITE B     [reangled — different hook, same story]
REWRITE C     [sharpest — cut to what earns its place]

FORMAT        single-tweet | thread | carousel-caption
MEDIA         [what visual this needs]
HOOK 1        [alternate opening — different entry shape]
HOOK 2        [alternate opening — different entry shape]
NEXT ANGLE    [the adjacent story this sets up]
```

---

## What to do with the output

1. Pick the rewrite that feels closest (A, B, or C)
2. Swap in the hook variant you prefer if it's sharper
3. Note the media requirement before scheduling
4. Log the next angle so it doesn't get lost

If you want the 3 rewrites pushed to `/review` for a pick later, say so — they get stored as a draft with A/B/C versions.

---

## Files

```
tone-agent/
  voice-critic.system.md   — the voice rules + calibration anchors (19 rules, 5 before/after pairs)
  distribution.md          — format, media, hook variant, and next-angle spec
  workflow.md              — this file
  examples.json            — approved tweets + divij_version rewrites (ground truth library)
```
