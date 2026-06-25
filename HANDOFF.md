# Bricx tone-app — Handoff & `/train` Build Plan

_Last updated: 2026-06-23. Author hand-off for the Compounding Taste Loop (CTL)._
_If you're a new session: read this top-to-bottom, then `lib/db/schema.ts`, `lib/generateRewrites.ts`, `lib/retrieve.ts`, `app/api/posts/route.ts`, `app/api/reactions/route.ts`. That's the whole spine._

---

## ★ SHIPPED STATE — 2026-06-23 (READ THIS FIRST; supersedes the build plan in PART 0–5 below)

**The entire `/train` + rehook plan below is BUILT, committed, and DEPLOYED.** Commit **`ba0fd67`** on `main` → live at https://tone-app-phi.vercel.app (remote `github.com/milliondreamsblog/BrandVoiceAgent`). PART 0–5 are now historical reference (the spec we built to).

### 🔴 #1 BLOCKER — Anthropic API credits EXHAUSTED (demo-critical, account-level, NOT code)
- Mid-session the Anthropic account ran **out of credits** (drained by 2 e2e runs + the deck-regen attempt). Error on every Opus call: `400 invalid_request_error — "Your credit balance is too low to access the Anthropic API."`
- **Effect:** every model call on prod fails RIGHT NOW — `/api/posts` (generate rewrites), `/api/critique`, `/api/rewrites/rehook`. The deployed code is healthy; the **account balance is empty**.
- **Fix (only the user can do this):** top up at console.anthropic.com → **Plans & Billing**. Until then the live AI demo will error out. **Rotating the key does NOT help** (same account/balance). Topping up is separate from the post-demo key rotation.

### ✅ Shipped this session (commit `ba0fd67`, clean message — no Claude trailers)
- **R1 — /review rehook preview-before-commit** (`app/components/RewriteCard.tsx`): previews the new hook with a persistent "not saved" revert banner; persists via `type:'edit'` then `type:'pick'`.
- **R2 — /train edit · comment · rehook** (`app/components/TrainCard.tsx`, both sides): Edit / Why / Hook controls; `edited_text` captured on choice → promoted to `taste_examples` as hand-refined ground truth; per-pair state reset (`app/train/page.tsx` renders two cards keyed `${pair.id}-left/-right`).
- **reactions pick refactor** (`app/api/reactions/route.ts`): promote-to-flywheel BEFORE flip→reviewed; idempotent prior-pick short-circuit (blocks double-click dupes); most-recent-edit-wins.
- **schema** (`lib/db/schema.ts`): `taste_choices.edited_text` — **migrated to prod ✅** via idempotent `scripts/migrate-train.ts` (`db:migrate:train`). Verified: `taste_choices.edited_text present: true`.
- **genPairs** (`scripts/genPairs.ts`): number-anchored high-contrast prompts + **delete-guard floor `MIN_PER_PILLAR=18`** — **validated for real today**: the credit-starved regen aborted (`✗ ABORTED — new run too thin`) WITHOUT wiping the live deck. This guard is the only reason a failed paid run didn't destroy the deck.
- **scripts:** `db:audit:pairs`, `db:backup:pairs` (+ package.json); `scripts/e2e.ts` expanded for the `edited_text` refine + no-op paths → **111/111 green**.

### ✅ Verified this session
- Local e2e **111/111** ("🟢 GREEN — Safe to deploy to prod").
- Prod deploy **healthy**: `/`, `/review`, `GET /api/train/pairs?bucket=*` all 200; bad bucket → 400 (read-only smoke, no Opus).
- Live deck **INTACT**: 18/18/18 (design/company/experiment). Reversible backup at `scripts/backups/taste_pairs-2026-06-23T11-11-35-315Z.json` (54 rows).

### ⏳ PENDING (priority order — all gated on credits except #4/#5)
1. **Top up API credits** → unblocks the entire live demo. Nothing AI works on prod until this is done.
2. **High-contrast deck regen** — `npm run gen:pairs` (~$3–6, ~54 Opus calls). Blocked ONLY on credits; the delete-guard makes retry safe. After success: `npm run db:audit:pairs` (verify contrast/overlap), optionally `db:backup:pairs` first. Prod currently serves the OLD 18/pillar deck — it works, just lower contrast than Divij's "lots of contrast" ask.
3. **Final prod e2e** — `E2E_BASE_URL=https://tone-app-phi.vercel.app npm run test:e2e` (gold-standard deployed-new-code check; self-cleaning). Needs credits (4 Opus calls). Local 111/111 stands in until then.
4. **Clean 3 e2e orphans in the LIVE /review queue** — a truncated test run left 3 `e2e-1782211961268…` pending posts visible in /review. **User opted to clean manually:** `npx tsx scripts/_clean-orphans.ts --apply` (with `npm run dev` up). That script is UNCOMMITTED (untracked) — delete it after use. (Inspect first without `--apply`.)
5. **Visual confirm** the R1/R2 controls render in the demo browser (frontend bundle — automated version-detection is unreliable).

### ⚠ Quality gaps carried forward (known, non-blocking)
- `genPairs` `register` axis uses `valid:()=>true` — relies only on the 0.6 word-overlap floor for contrast (no semantic check). Other axes validate (`hook`, `length`, `claim_density` number-anchored, etc.).
- `sessionId` may be null on a very fast pick → resume falls back to globally-un-chosen (acceptable lean cut).
- RewriteCard held-preview can rebase if the underlying rewrite text changes mid-preview (edge case).
- `/train` edit text is not trimmed before persist.
- `neither`/`skip` discards any in-progress edit text (by design).
- Duplicate `swapFirstLine`: `RewriteCard.tsx` keeps a local copy byte-identical to `lib/text.ts`; `TrainCard.tsx` imports the shared one correctly. Deferred cleanup, not a bug.

### NEXT (after demo + credits; gated on Divij saying /train works "perfectly")
- **Content-ideation agent** — segment ideas into 2 buckets (agency-updates & experiments). Open questions unchanged (PART 4 #2). Lock bucket↔pillar mapping with Divij first (working assumption: agency-updates = `company`, experiments = `experiment`).
- **Cost optimization** (the phase the user explicitly deferred to AFTER finishing): prompt-cache the ~7.5K-token voice rubric across the 4 Opus call sites; cap `/api/posts` batch (≤10). Full audit in memory file `api-cost-shape.md`.

---

## PART 0 (HISTORICAL — now BUILT & shipped) — VERIFIED BUILD SPEC (2026-06-23) — READ FIRST; supersedes rough notes below

Plan adversarially verified against the real code by 7 agents (141 tool calls). Per-area: schema **GREEN**, genPairs **GREEN**, /train-UI **GREEN**, retrieval **AMBER**, rehook **AMBER**, cross-cutting **AMBER** → **GREEN to build once the 3 blockers below are honored (now baked into this spec).** Full scope ≈ 9–12h (NOT by 1 PM). **Leanest 1 PM cut ≈ 4–5h and includes rehook** (end of this section).

### The 3 blockers (exact fixes — do these or it breaks)
1. **`retrieveExamples` positional-arg break — breaks LIVE generation on deploy.** `retrieve.ts:30` is `retrieveExamples(draft, k=4)`; the only caller `generateRewrites.ts:22` passes `retrieveExamples(draft, 4)`. Adding `pillar` in the middle makes `4` the pillar. **Fix:** signature `retrieveExamples(draft, pillar?: Pillar, k = 4)` AND edit the call to `retrieveExamples(draft, pillar, 4)` (pillar already in scope at `generateRewrites.ts:20`) **in the same commit.** "Backward-compatible" holds only at the data layer (no pillar ⇒ global pool), NOT at the source level.
2. **Rehook client-only swap is silently discarded — false training claim.** PART 3.8's "the swapped hook already flows through the pick→promotion" is **FALSE**: the pick handler promotes DB text (`reactions/route.ts:125` `editRows[0]?.payload ?? rw?.text`), never client state; `RewriteCard.react()` sends only `{postId, rewriteId, type:'pick'}`. **Fix:** when Divij taps a new hook, **persist it** via `POST /api/reactions {type:'edit', payload:<full text, first line swapped>}` — the pick handler already prefers `editRows[0]?.payload`, so it then promotes correctly and shows in the existing ✎ edit panel. Then `onAfter()` to refresh.
3. **E2E gate goes RED — blocks the prod push.** `e2e.ts:266` asserts absolute `taste_examples count back to baseline`; cleanup keys only on `source_post_id` (`:280`). A /train pick inserts `source='game'` with `sourcePostId=NULL` → invisible to cleanup → residue → RED. **Fix BEFORE any prod push (parallel-critical, NOT deferrable):** (a) extend cleanup to delete this run's `source='game'` taste_examples + its taste_choices/taste_pairs (tag rows); (b) relax `:266` to a membership/delta check (rest of the file already does this); (c) add one /train happy-path assertion (POST choice → taste_choices row + `source='game'` taste_examples with `pillar=bucket`).

### Other must-fix (baked in)
- **Flywheel pillar one-liner (ship WITH retrieval, step 2):** add `pillar: post?.pillar ?? null` to the insert at `reactions/route.ts:133` (`post` fetched at :111; column nullable). Else /review picks never enter their bucket → bucket retrieval starved day one.
- **Keep `category` — do NOT drop it** (`retrieve.ts:39` scores on it, `generateRewrites.ts:28` renders it, `seed.ts` writes it). This round only ADDS `pillar`.
- **Structured-output truth:** array length constraints are **unsupported entirely** and silently stripped by the SDK (not "except 0/1"). genPairs models the two sides as **named required string fields** `left_text`/`right_text` (1:1 to columns); rehook emits `{hooks:[{text}]}` and **slices/pads to exactly 3 in app code** (mirror `posts/route.ts:64`).
- **category→pillar map (exact-string, case-sensitive):** `{'Design Tweets':'design','Agency Updates':'company','Experiments':'experiment'}` (verified vs examples.json; 'Other ideas' declared-but-unused). Wire INTO `seed.ts` at insert (`pillar: MAP[ex.category] ?? null`) so re-seed stays correct — a standalone UPDATE is wiped by the next `db:seed`. **Lean cut MAY skip** (null pillar = global fallback).
- **`db:push` attended:** no `drizzle/` dir, so push introspects live Neon directly; diff is purely additive (CREATE TABLE ×2 + ADD COLUMN nullable). Run in a real terminal, eyeball statements, confirm zero ALTER/DROP on existing columns.
- **/train neutral cards:** OMIT the optional `state` prop on TweetCard (absence ⇒ neutral). Selection highlight = a NEW non-green class (never `state-correct`). **Use `.review-empty` (always visible), NEVER `.result-empty` (display:none <1280px).** Reuse `.pick-grid`, `.mode-bar`/`.mode-btn`, `.game-progress`, `.btn*`.
- **/train endpoints:** GET `/api/train/pairs?bucket=` — validate via `isPillar`, 400 on bad, map querystring `bucket`→column `pillar`, order by `createdAt` (DROP "front-load highest-contrast" — no contrast column exists). POST `/api/train/choice` — validate `pairId`+`chosen∈{left,right,neither}`; insert taste_choices; **guard the promote on `chosen!=='neither'` AND non-null chosenText**; disable both cards on submit (busy) to block double-insert (neon-http has no transaction). sessionId: mint client-side `crypto.randomUUID()` on mount, thread through POST; lean cut "un-chosen" = globally un-chosen (skip session scoping).
- **genPairs idempotency + cap:** `delete WHERE source='opus-seed'` before insert; hard call cap (~18 = 3 pillars × 6 axes, ~3 pairs/call); use `DATABASE_URL_UNPOOLED ?? DATABASE_URL`. Writes taste_pairs ONLY — never promotes to taste_examples.
- **rehook details:** `onRehook?:()=>void` on TweetCard, render ↻ only when truthy + `stopPropagation` (nested-button invalid HTML when onClick set — safe in RewriteCard, no onClick). "first line" = text before first `\n`; single-line tweet (~14/42) ⇒ replace whole; `newText = newHook + (rest ? '\n'+rest : '')`. Guard missing `ANTHROPIC_API_KEY` (anthropic.ts:5 falls back to a literal key → 401). Depends on step-2 retrieval (or global fallback). **which-hook log: DROP for 1 PM** (taste_choices needs NOT-NULL pairId; no home).

### LOCKED build order (each step independently revertable)
1. **`db:push`** (attended) — apply the already-written schema. DB-only; prod keeps working.
2. **Retrieval + flywheel, ONE commit** — `retrieve.ts` new signature + filter-to-pillar-then-backfill-if-sparse (sparse = matched < k; top up from pillar-null seeds first, then other pillars last); update `generateRewrites.ts:22` call; add the `reactions/route.ts:133` pillar one-liner. **Only step that can break live generation — test generation still works after.**
3. **`scripts/genPairs.ts`** — generate ~30–50 pairs into taste_pairs; RUN it (hard prerequisite: /train shows nothing until pairs exist).
4. **/train endpoints + page + nav swap.**
5. **Update `scripts/e2e.ts`** (parallel with 4) — cleanup + relax + /train assertion; run GREEN (gates the push).
6. **Rehook** (last; depends on step 2) — ↻ + endpoint + persist-as-edit + swap.

### Leanest 1 PM cut (~4–5h; feasible only if genPairs + e2e run parallel to the /train UI build, db:push first thing)
INCLUDE: db:push; the step-2 commit; genPairs ~30–40 pairs (light validity check, capped); /train = bucket selector + pick + reason chip + neither-guard + progress + immediate persist + nav swap (reuse `.review-empty`/`.pick-grid`; resume = globally un-chosen); bucket-first retrieval; rehook = regenerate-3 + persist-as-edit + swap; e2e relaxed to membership + one /train assertion (do NOT skip — it gates deploy).
SKIP: seed category→pillar backfill (null=global works), GET `/api/train/summary` tally, strength weighting, which-hook log, Claude-vs-GPT, validated-extremes regenerate loop.
Uncompressible critical path: **db:push → genPairs populates → /train testable**; and **e2e-green gates the push** regardless of UI polish.

---

## PART 1 — PROJECT STATE (what's already live)

**Product:** Bricx Founder's Office content engine. "System A" = a voice/tone co-pilot that turns a writer's draft into 3 publish-ready rewrites in **Divij's** voice; Divij reviews and picks; picks train the agent. (Divij = founder; Akshat = builder.)

**Shipped & live** at https://tone-app-phi.vercel.app (pushed to `main`, commit `c3f4371`, remote `github.com/milliondreamsblog/BrandVoiceAgent`):
- **CTL loop:** `/write` → `POST /api/posts` pre-generates 3 rewrites/post (one Opus call each, parallel) → `/review` shows tweet cards + RewriteCards (like / disapprove / comment / edit + a separate **pick**) → `POST /api/reactions`. A **pick** marks the post reviewed and promotes the chosen text into `taste_examples (source='flywheel')`, which retrieval surfaces next round.
- **Content pillars** (`design` / `company` / `experiment`): per-post tagging in compose; `/review` filter tabs (All + 3 pillars); pillar steers generation via a one-line hint.
- **Delete a draft + untrain:** `DELETE /api/posts?id=` cascades rewrites/reactions AND drops the promoted flywheel example (`taste_examples.source_post_id` FK, ON DELETE CASCADE).
- **Pre-deploy E2E gate:** `scripts/e2e.ts` (`npm run test:e2e`) — 62/62 green. Drives real HTTP endpoints, asserts side effects in Neon, self-cleaning. Run before every prod push. `E2E_BASE_URL=<url>` to target a deployment.

**Stack:** Next.js 15 App Router (`bricx-tone`), Neon Postgres + Drizzle (`drizzle-orm/neon-http`), Anthropic **Messages SDK**, model **`claude-opus-4-8`**, structured outputs via `output_config.format` (json_schema). Images stored as in-browser-downscaled data URLs in Neon (counts-only note to Opus). Standalone scripts (`npx tsx scripts/x.ts`) parse `DATABASE_URL` from `.env.local`.

**DB tables:** `batches → posts → rewrites → reactions` (+ `taste_examples`). See `lib/db/schema.ts`.

**Secrets status:** `ANTHROPIC_API_KEY`, Neon password, blob token are **unrotated, kept for the demo** (Divij's call), live only in `.env.local` (gitignored — never committed). Rotate after the demo.

---

## PART 2 — THE GAP WE'RE FIXING (read this before building)

**Taste is NOT bucketed today — it's one global pool.** Verified in code:
- `retrieve.ts` does `db.select().from(tasteExamples)` over the WHOLE table, scores by keyword overlap, returns top 4. **No pillar/category filter.**
- `generateRewrites` calls `retrieveExamples(draft, 4)` — passes the draft only, **not the pillar.**
- `taste_examples.category` is free-text, used only as keyword fodder (`retrieve.ts:39`), never as a bucket.
- The flywheel promotion in `reactions/route.ts` doesn't set `category` at all → picked examples land **bucket-less**, even though their post has a pillar.

**Consequence:** generating a `company` rewrite can retrieve `design`/`experiment` examples → cross-bucket bleed. This contradicts Divij's explicit ask: capture taste **per bucket** ("agency updates ≠ experiments").

**Vocabulary to lock with Divij:** tool has **3** pillars (design/company/experiment); Divij framed **2** ideation buckets ("agency updates & experiments"). "office" = the `company` pillar. Open Q: is **design** a real taste bucket or just short captions? Keep the 3 slugs as the canonical vocabulary everywhere.

---

## PART 3 — `/train` BUILD PLAN (today's priority — live by 1 PM)

**Decision:** disable `/game` (remove from `app/nav.tsx`; leave `app/game/page.tsx` in tree for reuse) and build **`/train` from scratch**. Why not extend `/game`: opposite contract — `/game` is a quiz with a *right answer* that *saves nothing*; `/train` has *no right answer* (Divij's pick DEFINES correct) and *must persist* every pick as training data.

**Goal:** a first-run calibration where Divij does ~50 high-contrast **this-or-that** picks. Each pair contrasts on ONE controlled axis pushed to extremes ("capture extremes" — his words). Every pick persists to Neon, tagged by **bucket + axis**; winners feed the existing retrieval pipeline immediately (`taste_examples source='game'`).

### 3.1 Schema changes (`lib/db/schema.ts` + `db:push`)
1. **`taste_examples.pillar`** — add a typed column (slug). Retire/normalize `category`.
   - Backfill seeds: map existing `category` → pillar slug.
   - Fix flywheel promotion (`reactions/route.ts`): set `pillar = post.pillar` on promote (one line).
2. **`taste_pairs`** (the generated calibration pairs):
   `id, bucket(slug), axis(text), leftText, rightText, leftMeta?, rightMeta?, source('opus-seed'), createdAt`
3. **`taste_choices`** (the training signal — Divij's picks):
   `id, pairId(FK→taste_pairs), bucket, axis, chosen('left'|'right'|'neither'), chosenText(denormalized), strength('mild'|'strong')?, reasonChip?, note?, sessionId?, createdAt`
   - On a real pick (not 'neither'): promote `chosenText` → `taste_examples(source='game', pillar=bucket)`. That's what makes the game *train* through the existing loop on day one.
   - _Speed shortcut if time-crunched:_ keep pairs in a generated JSON file (like old `/game` PAIRS) and only add `taste_choices` + the `taste_examples.pillar` column. Table is cleaner (queryable, supports resume) — prefer it if time allows.

### 3.2 Retrieval upgrade (`lib/retrieve.ts` + `generateRewrites.ts`)
- `retrieveExamples(draft, pillar, k)` → filter to `pillar`, backfill from global pool only if the bucket is sparse. Pass `post.pillar` from `generateRewrites`. Backward-compatible (no pillar → global, as today). **⚠ CORRECTED in PART 0 — signature must be `(draft, pillar?, k=4)` AND the existing call at `generateRewrites.ts:22` edited in the SAME commit, or live generation breaks (`4` becomes the pillar). Also add `pillar: post?.pillar ?? null` to the flywheel insert `reactions/route.ts:133` in this commit.**

### 3.3 Pair generation (`scripts/genPairs.ts`, offline like `seed.ts`)
- For each **bucket × axis**, generate contrastive pairs via Opus — same underlying idea, two versions pushed to **opposite extremes** of one axis. Force genuine extremes (a pair where both sides are similar = noise; validate & regenerate weak pairs).
- **Axes (rotate):** `hook` (bold-claim ↔ question ↔ setup), `length` (terse ↔ developed), `register` (punchy/casual ↔ measured), `claim_density` (concrete number/example ↔ abstract), `opener` (cold-open ↔ context-first), `rhythm` (line-break-heavy ↔ flowing).
- Seed ideas from `tone-agent/examples.json` option-sets + the 19 seed `taste_examples` + a few synthetic topics per bucket.
- Target ~50 total spread across 3 buckets × ~6 axes. Insert into `taste_pairs`. (One Opus call can emit several pairs — cheap. **⚠ CORRECTED in PART 0: array length constraints are unsupported ENTIRELY (silently stripped by the SDK), not "except 0/1". Model the two sides as named required string fields `left_text`/`right_text` — NOT an items array. Enforce N in app code. Idempotency: `delete WHERE source='opus-seed'` before insert; cap calls.**)

### 3.4 UI (`app/train/page.tsx`)
- Bucket selector (design/company/experiment) — Divij calibrates a bucket, or a guided run cycles buckets.
- Two `TweetCard`s side-by-side, **neutral labels** — NO "approved"/green-red state hints (unlike `/game`; there's no correct answer).
- Controls: click a card to choose; a row of **axis-grounded reason chips** (one-tap "why"); a **"both off / neither"** escape (avoids forced-choice noise); optional **mild/strong**; a **progress bar** (e.g., 12/50).
- Persist each choice immediately (partial session still yields data + resume).
- End screen: a simple per-axis/per-bucket tally ("rough read of your taste") — nice founder payoff.
- `app/nav.tsx`: swap **Game → Train**.

### 3.5 Endpoints
- `GET /api/train/pairs?bucket=&limit=` → un-chosen pairs for the bucket. **⚠ CORRECTED in PART 0: DROP "front-load highest-contrast" — no contrast-score column exists; order by `createdAt`. Validate `bucket` via `isPillar` (400 on bad); map querystring `bucket`→column `pillar`.**
- `POST /api/train/choice` → `{pairId, chosen, reasonChip?, strength?, note?}` → insert `taste_choices` + (if not 'neither') promote winner to `taste_examples`.
- `GET /api/train/summary` → per-bucket/per-axis tally (end screen). _(defer if tight)_

### 3.6 MVP cut for 1 PM vs defer
- **Ship (1 PM):** schema (`taste_pairs` + `taste_choices` + `taste_examples.pillar`); `genPairs` run to populate ~50; `/train` UI = pick + reason chip + neither + progress + persistence; winner→`taste_examples`; nav swap; **bucket-first retrieval wired** (so trained data immediately improves generation); **rehook ("change hook") — ↻ on TweetCard → 3 hook options → swap (see 3.8)**.
- **Defer:** per-axis distilled **taste profile** injected into the prompt (vs just retrieval anchors); adaptive narrowing (wide extremes → near-boundary pairs); strength weighting in retrieval; end-screen taste read; Claude-vs-GPT arm; ideation agent.

### 3.7 Risks
- **Fatigue at 50** → front-load contrast, persist+resume, progress bar.
- **No-right-answer framing** → UI must not hint which side is "approved."
- **Weak pairs** → genPairs must force real extremes; validate.
- **Don't break prod** → `taste_examples.pillar` add is additive; retrieval change is backward-compatible.

### 3.8 Rehook / "change hook" (Divij's explicit ask — IN 1 PM scope)
- **Endpoint** `POST /api/rewrites/rehook` → body `{ rewriteText, pillar, mediaNote? }` → returns **3 alternative hooks** (first line only; the body of the rewrite is untouched). Reuses the voice rubric + bucket-aware retrieval; focused prompt ("keep the body, give 3 new opening lines, in-voice, distinct angles"). Structured output `{ hooks: [{text}] }` — slice/pad to exactly 3 in app code (array length constraints unsupported entirely; mirror `posts/route.ts:64`). **Guard missing `ANTHROPIC_API_KEY` (anthropic.ts:5 falls back to a literal key → would 401).**
- **UI** — optional `onRehook` prop on `TweetCard` renders a small **↻** button. Wired in `/review`'s `RewriteCard` (primary surface). Click → fetch 3 hooks → inline option list → tap one → swap that rewrite's first line in client state. NOT wired into `/train` or `/game` (prop absent ⇒ no icon).
- **Taste capture (near-free bonus)** — log which hook he taps; and on a later **pick**, the hook-swapped text already flows through the existing pick→`taste_examples` promotion, so rehook both improves the post AND yields preference data. **⚠ CORRECTED in PART 0 — FALSE as written: the pick handler promotes DB text (`reactions/route.ts:125`), not client state. A first-line swap living only in React trains NOTHING. The swap MUST be persisted via `POST /api/reactions {type:'edit', payload:<full swapped text>}` (pick prefers `editRows[0]?.payload`), then `onAfter()`. "first line" = before first `\n`; single-line tweet ⇒ replace whole. The which-hook log has no home (taste_choices needs NOT-NULL pairId) — DROP for 1 PM.**
- **MVP lean line:** regenerate 3 + swap into the card is the must-ship; the which-hook log is the bonus if time allows.

---

## PART 4 — BACKLOG (after `/train` works "perfectly", in Divij's words)

_(Rehook moved UP to PART 3.8 — now in the 1 PM scope.)_

1. **Claude-vs-GPT model bake-off** (NEXT training round, explicitly not today): dedicate a *tagged slice* (~10-15) of a future game to blind Claude-vs-GPT on the SAME prompt+draft, randomized sides. Tells you which model nails his voice; if GPT wins, first port *why* into the Claude prompt before switching. Production stays Claude. Keep it SEPARATE from style-axis pairs (model confound ruins both signals).
2. **Ideation agent** (Divij's next big ask — segment ideas into agency-updates & experiments). Questions to lock with Divij first:
   - Source: real Bricx happenings / external trends / your brain-dumps / all? For agency updates, how does it learn what actually happened (can't invent news)?
   - Output: idea seeds / developed angles / full drafts?
   - Buckets: lock "agency update" vs "experiment" defs; map to the 3 pillars?
   - Flow: ideas straight into draft→rewrites→review, or approve the idea first?
   - Cadence: how many per bucket, how often — daily digest or on-demand?
   - Your insight: 20-sec voice note / one bullet per idea, or fully autonomous from trends?
   - Bar: what makes you say "yes, draft this"?
3. **Cost levers** (when scaling — not urgent at demo volume): prompt-cache the 7,440-token rubric (~45% off per call); Message Batches API (flat 50% off, and the design already tolerates async since Divij reviews later).
4. **Dead code:** `/api/drafts`, `/api/upload` (R2, dormant — no card), `/api/critique` legacy — prune when convenient.

---

## PART 5 — DECISIONS LOG (this session, 2026-06-23)
- Disable `/game`, keep its code, build `/train` fresh (different contract).
- Taste MUST be bucketed per pillar (retrieval is global today — that's the gap).
- Defer Claude-vs-GPT to a later training round.
- Rehook ("change hook") PULLED INTO the 1 PM scope (was backlog): ↻ on the card → 3 hook options → swap; which-hook log is the bonus. Spec in PART 3.8.
- Keep production on Claude Opus 4.8; eval/experiments may use other models but never silently switch prod.
- Canonical vocabulary = 3 pillar slugs (design/company/experiment); "office" = company.
