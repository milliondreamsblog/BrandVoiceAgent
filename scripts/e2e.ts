/* ──────────────────────────────────────────────────────────────────────────
 * End-to-end test for the Bricx tone-app "Compounding Taste Loop".
 *
 * Drives the REAL HTTP endpoints (POST/GET/DELETE /api/posts, POST
 * /api/reactions) and verifies every side effect directly in Neon. Covers:
 *   1. Generation         — submit drafts -> 3 rewrites each, pillar stored
 *   2. GET filtering      — status x pillar (all/design/company/experiment)
 *   3. Reaction matrix     — like-toggle, disapprove<->like mutual exclusion,
 *                            comment (append), edit (replace), pick (terminal)
 *   4. Flywheel promotion  — pick -> taste_examples(source='flywheel') with the
 *                            hand-edit as approvedText, comments as editNotes,
 *                            and source_post_id linked back to the post
 *   5. Train calibration   — seed taste_pairs, GET /api/train/pairs (deck +
 *                            exclude-chosen), POST /api/train/choice (left →
 *                            taste_choices + source='game' promotion with the
 *                            rejected side as `original`; neither → no promotion)
 *   6. Rehook              — POST /api/rewrites/rehook returns on-voice hooks
 *   7. Delete + untrain    — DELETE removes the post, its rewrites, reactions,
 *                            AND its flywheel example; seed rows untouched
 *
 * Self-cleaning and idempotent: it creates its own throwaway batch + tagged
 * train pairs, asserts via membership (not absolute totals) so existing demo
 * data is irrelevant, and removes 100% of what it created (including game
 * promotions and taste_pairs/choices) in a finally block — safe to run before
 * every deploy. Never touches the 19 seed taste_examples or the demo posts.
 *
 * Run:   npm run test:e2e            (against the local dev server)
 *        E2E_BASE_URL=https://tone-app-phi.vercel.app npm run test:e2e
 *
 * Requires: the target app running, and DATABASE_URL in .env.local (the same
 * Neon DB the app uses).
 * ────────────────────────────────────────────────────────────────────────── */
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
const dbUrl = env.match(/^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m)?.[1].trim();
if (!dbUrl) throw new Error("DATABASE_URL not found in .env.local");
const sql = neon(dbUrl);

// ── tiny assertion harness ──
type Check = { label: string; pass: boolean; info: string };
const checks: Check[] = [];
function check(label: string, pass: boolean, info = "") {
  checks.push({ label, pass, info });
  console.log(`${pass ? "✅" : "❌"} ${label}${info ? `  — ${info}` : ""}`);
}
function eq(label: string, actual: unknown, expected: unknown) {
  check(
    label,
    JSON.stringify(actual) === JSON.stringify(expected),
    `got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
  );
}
function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ── API helper ──
async function api(method: string, p: string, body?: unknown) {
  const res = await fetch(BASE + p, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON */
  }
  return { status: res.status, ok: res.ok, json };
}
const react = (postId: string, type: string, rewriteId?: string, payload?: string) =>
  api("POST", "/api/reactions", { postId, type, rewriteId, payload });

// ── DB probes ──
const rxOf = (postId: string) =>
  sql`SELECT type, rewrite_id, payload FROM reactions WHERE post_id=${postId}`;
const rewritesOf = (postId: string) =>
  sql`SELECT id, label, text, recommended FROM rewrites WHERE post_id=${postId} ORDER BY label`;
const postStatus = async (postId: string) =>
  (await sql`SELECT status FROM posts WHERE id=${postId}`)[0]?.status ?? null;
const flywheelOf = (postId: string) =>
  sql`SELECT approved_text, edit_notes, original, source FROM taste_examples WHERE source_post_id=${postId}`;
const count = async (q: any) => Number((await q)[0].c);

const tag = `e2e-${Date.now()}`;
let batchId: string | null = null;
let trainPairIds: string[] = [];

async function run() {
  // Baseline so we can prove zero residue at the end.
  const startPosts = await count(sql`SELECT count(*)::int c FROM posts`);
  const startTaste = await count(sql`SELECT count(*)::int c FROM taste_examples`);
  const seedTaste = await count(
    sql`SELECT count(*)::int c FROM taste_examples WHERE source='seed'`
  );
  console.log(`Baseline: posts=${startPosts} taste=${startTaste} (seed=${seedTaste})`);

  // ── 1. GENERATION ──────────────────────────────────────────────────────
  section("1. Generation (POST /api/posts → 3 rewrites each)");
  const submit = await api("POST", "/api/posts", {
    posts: [
      { body: `${tag} design — shipped a cleaner empty state today.`, pillar: "design" },
      { body: `${tag} company — we just crossed 50 design partners.`, pillar: "company" },
      { body: `${tag} experiment — what if onboarding were a single screen?`, pillar: "experiment" },
    ],
  });
  check("POST /api/posts returns 200", submit.status === 200, `status ${submit.status}`);
  eq("POST reports 3 posts created", submit.json?.count, 3);
  batchId = submit.json?.batchId ?? null;
  check("batchId returned", !!batchId);

  const rows = (await sql`
    SELECT id, pillar, body, status FROM posts WHERE batch_id=${batchId}
  `) as { id: string; pillar: string; body: string; status: string }[];
  eq("3 posts persisted in batch", rows.length, 3);

  const P: Record<string, string> = {};
  for (const r of rows) P[r.pillar] = r.id;
  check(
    "pillars stored correctly (design/company/experiment)",
    !!P.design && !!P.company && !!P.experiment,
    `pillars=[${rows.map((r) => r.pillar).join(",")}]`
  );

  const rw: Record<string, { id: string; label: string; text: string; recommended: boolean }[]> = {};
  for (const pillar of ["design", "company", "experiment"]) {
    const list = (await rewritesOf(P[pillar])) as any[];
    rw[pillar] = list;
    eq(`${pillar}: exactly 3 rewrites`, list.length, 3);
    eq(`${pillar}: labels are A/B/C`, list.map((x) => x.label), ["A", "B", "C"]);
    check(
      `${pillar}: every rewrite has non-empty text`,
      list.every((x) => x.text && x.text.trim().length > 0)
    );
    eq(
      `${pillar}: exactly one recommended`,
      list.filter((x) => x.recommended).length,
      1
    );
  }

  // ── 2. GET FILTERING (membership-based) ─────────────────────────────────
  section("2. GET filtering (status × pillar)");
  const has = (g: any, id: string) => (g.json?.posts ?? []).some((p: any) => p.id === id);

  const pendAll = await api("GET", "/api/posts?status=pending&pillar=all&page=1");
  check("pending+all includes all 3 new posts",
    has(pendAll, P.design) && has(pendAll, P.company) && has(pendAll, P.experiment));
  const sampled = (pendAll.json?.posts ?? []).find((p: any) => p.id === P.design);
  eq("GET nests rewrites (3) for a post", sampled?.rewrites?.length, 3);
  check("GET returns a reactions array", Array.isArray(sampled?.reactions));

  const pendDesign = await api("GET", "/api/posts?status=pending&pillar=design&page=1");
  check("pending+design includes the design post", has(pendDesign, P.design));
  check("pending+design excludes the company post", !has(pendDesign, P.company));
  check(
    "pending+design rows are all design",
    (pendDesign.json?.posts ?? []).every((p: any) => p.pillar === "design")
  );

  // ── 3. REACTION MATRIX (on the design post) ─────────────────────────────
  section("3. Reaction matrix");
  const [A, B, C] = rw.design;

  const like1 = await react(P.design, "like", A.id);
  eq("like A → active:true", like1.json?.active, true);
  const likeRows1 = (await rxOf(P.design)) as any[];
  eq("DB: one like on A", likeRows1.filter((r) => r.type === "like" && r.rewrite_id === A.id).length, 1);

  const like2 = await react(P.design, "like", A.id);
  eq("like A again → toggles off (active:false)", like2.json?.active, false);
  const likeRows2 = (await rxOf(P.design)) as any[];
  eq("DB: like on A removed", likeRows2.filter((r) => r.type === "like" && r.rewrite_id === A.id).length, 0);

  await react(P.design, "disapprove", B.id);
  const dis = (await rxOf(P.design)) as any[];
  eq("DB: disapprove on B present", dis.filter((r) => r.type === "disapprove" && r.rewrite_id === B.id).length, 1);

  await react(P.design, "like", B.id);
  const mx = (await rxOf(P.design)) as any[];
  eq("mutual exclusion: disapprove on B cleared", mx.filter((r) => r.type === "disapprove" && r.rewrite_id === B.id).length, 0);
  eq("mutual exclusion: like on B present", mx.filter((r) => r.type === "like" && r.rewrite_id === B.id).length, 1);

  await react(P.design, "comment", C.id, "E2E hook is strong");
  await react(P.design, "comment", C.id, "E2E tighten the close");
  const comments = ((await rxOf(P.design)) as any[]).filter((r) => r.type === "comment");
  eq("comments append (2 total)", comments.length, 2);

  await react(P.design, "edit", C.id, "E2E edited C — v1");
  await react(P.design, "edit", C.id, "E2E edited C — FINAL");
  const edits = ((await rxOf(P.design)) as any[]).filter((r) => r.type === "edit" && r.rewrite_id === C.id);
  eq("edit replaces (1 edit row)", edits.length, 1);
  eq("edit holds the latest text", edits[0]?.payload, "E2E edited C — FINAL");

  // pick C (terminal)
  const pick = await react(P.design, "pick", C.id);
  eq("pick → picked:true", pick.json?.picked, true);
  eq("post is now reviewed", await postStatus(P.design), "reviewed");
  const rwAfter = (await rewritesOf(P.design)) as any[];
  eq("picked rewrite (C) is recommended", rwAfter.find((x) => x.label === "C")?.recommended, true);
  eq("non-picked rewrites not recommended",
    rwAfter.filter((x) => x.label !== "C").every((x) => x.recommended === false), true);

  // ── 4. FLYWHEEL PROMOTION ───────────────────────────────────────────────
  section("4. Flywheel promotion (pick → taste_examples)");
  const fwDesign = (await flywheelOf(P.design)) as any[];
  eq("one flywheel example created", fwDesign.length, 1);
  eq("flywheel source is 'flywheel'", fwDesign[0]?.source, "flywheel");
  eq("approvedText = the hand-edit", fwDesign[0]?.approved_text, "E2E edited C — FINAL");
  check("editNotes carries both comments",
    !!fwDesign[0]?.edit_notes &&
      fwDesign[0].edit_notes.includes("E2E hook is strong") &&
      fwDesign[0].edit_notes.includes("E2E tighten the close"),
    `editNotes=${JSON.stringify(fwDesign[0]?.edit_notes)}`);
  check("original = the post body", (fwDesign[0]?.original ?? "").startsWith(tag));

  // company: simple pick, NO edit/comment → approvedText is the raw rewrite text
  const companyA = rw.company[0];
  await react(P.company, "pick", companyA.id);
  const fwCompany = (await flywheelOf(P.company)) as any[];
  eq("company pick promotes 1 flywheel example", fwCompany.length, 1);
  eq("company approvedText = raw rewrite text (no edit)", fwCompany[0]?.approved_text, companyA.text);
  eq("company editNotes is null (no comments)", fwCompany[0]?.edit_notes, null);

  // ── 5. STATUS TRANSITIONS (post-pick) ───────────────────────────────────
  section("5. Status transitions after picks");
  const rev = await api("GET", "/api/posts?status=reviewed&pillar=all&page=1");
  check("reviewed includes picked design + company", has(rev, P.design) && has(rev, P.company));
  check("reviewed excludes the still-pending experiment", !has(rev, P.experiment));
  const pend2 = await api("GET", "/api/posts?status=pending&pillar=all&page=1");
  check("pending now includes only experiment (of ours)",
    has(pend2, P.experiment) && !has(pend2, P.design) && !has(pend2, P.company));
  const revDesign = await api("GET", "/api/posts?status=reviewed&pillar=design&page=1");
  check("reviewed+design includes the design post", has(revDesign, P.design));

  // ── 6. TRAIN CALIBRATION (taste_pairs → choice → game promotion) ────────
  section("6. Train calibration (/api/train)");

  // Seed two throwaway pairs in the experiment bucket (tagged for cleanup).
  const [pairLeft] = (await sql`
    INSERT INTO taste_pairs (pillar, axis, left_text, right_text, left_meta, right_meta, source)
    VALUES ('experiment', 'hook', ${tag + " LEFT — punchy hook"}, ${tag + " RIGHT — slow hook"},
            'punchy', 'slow', 'e2e')
    RETURNING id`) as { id: string }[];
  const [pairNeither] = (await sql`
    INSERT INTO taste_pairs (pillar, axis, left_text, right_text, left_meta, right_meta, source)
    VALUES ('experiment', 'length', ${tag + " LEFT — terse"}, ${tag + " RIGHT — long"},
            'terse', 'long', 'e2e')
    RETURNING id`) as { id: string }[];
  trainPairIds = [pairLeft.id, pairNeither.id];
  check("seeded 2 e2e taste_pairs", trainPairIds.every(Boolean));

  const deck1 = await api("GET", "/api/train/pairs?bucket=experiment");
  check("GET train pairs → 200", deck1.status === 200, `status ${deck1.status}`);
  const inDeck1 = (id: string) => (deck1.json?.pairs ?? []).some((p: any) => p.id === id);
  check("deck includes both unchosen pairs", inDeck1(pairLeft.id) && inDeck1(pairNeither.id));
  const sampledPair = (deck1.json?.pairs ?? []).find((p: any) => p.id === pairLeft.id);
  eq("deck pair exposes leftText", sampledPair?.leftText, tag + " LEFT — punchy hook");
  check("deck pair does NOT leak source", !!sampledPair && !("source" in sampledPair));

  const badBucket = await api("GET", "/api/train/pairs?bucket=nonsense");
  eq("GET train pairs bad bucket → 400", badBucket.status, 400);

  // choose LEFT → recorded + promoted to taste_examples(source='game')
  const sid = randomUUID();
  const choice1 = await api("POST", "/api/train/choice", {
    pairId: pairLeft.id, chosen: "left", reasonChip: "sharper", sessionId: sid,
  });
  eq("POST choice(left) → 200", choice1.status, 200);
  eq("choice(left) promoted:true", choice1.json?.promoted, true);

  const ch1 = (await sql`
    SELECT chosen, chosen_text, pillar, axis, reason_chip
    FROM taste_choices WHERE pair_id=${pairLeft.id}`) as any[];
  eq("one taste_choices row for the pair", ch1.length, 1);
  eq("choice chosen='left'", ch1[0]?.chosen, "left");
  eq("choice chosen_text = left text", ch1[0]?.chosen_text, tag + " LEFT — punchy hook");
  eq("choice pillar from pair (not client)", ch1[0]?.pillar, "experiment");
  eq("choice axis from pair", ch1[0]?.axis, "hook");
  eq("choice reason_chip persisted", ch1[0]?.reason_chip, "sharper");

  const ge1 = (await sql`
    SELECT approved_text, original, pillar, source
    FROM taste_examples WHERE source='game' AND approved_text=${tag + " LEFT — punchy hook"}`) as any[];
  eq("game promotion: 1 taste_example", ge1.length, 1);
  eq("game approvedText = chosen (left)", ge1[0]?.approved_text, tag + " LEFT — punchy hook");
  eq("game original = the rejected side (right)", ge1[0]?.original, tag + " RIGHT — slow hook");
  eq("game pillar = experiment", ge1[0]?.pillar, "experiment");

  const deck2 = await api("GET", "/api/train/pairs?bucket=experiment");
  check("chosen pair excluded from deck",
    !(deck2.json?.pairs ?? []).some((p: any) => p.id === pairLeft.id));
  check("unchosen pair still in deck",
    (deck2.json?.pairs ?? []).some((p: any) => p.id === pairNeither.id));

  // choose NEITHER → recorded, NOT promoted
  const choice2 = await api("POST", "/api/train/choice", {
    pairId: pairNeither.id, chosen: "neither", sessionId: sid,
  });
  eq("POST choice(neither) → 200", choice2.status, 200);
  eq("choice(neither) promoted:false", choice2.json?.promoted, false);
  const ch2 = (await sql`
    SELECT chosen, chosen_text FROM taste_choices WHERE pair_id=${pairNeither.id}`) as any[];
  eq("neither: one choice row", ch2.length, 1);
  eq("neither: chosen='neither'", ch2[0]?.chosen, "neither");
  eq("neither: chosen_text is null", ch2[0]?.chosen_text, null);
  const ge2 = await count(sql`
    SELECT count(*)::int c FROM taste_examples
    WHERE source='game' AND original=${tag + " RIGHT — long"}`);
  eq("neither: NOT promoted to taste_examples", ge2, 0);

  // validation
  const badChoice = await api("POST", "/api/train/choice", { pairId: pairLeft.id, chosen: "bogus" });
  eq("POST choice bad 'chosen' → 400", badChoice.status, 400);
  const missingPair = await api("POST", "/api/train/choice", { chosen: "left" });
  eq("POST choice missing pairId → 400", missingPair.status, 400);

  // Clean the train test data WITHIN run() so section 9 sees zero residue.
  await sql`DELETE FROM taste_examples WHERE source='game'
    AND (approved_text LIKE ${"%" + tag + "%"} OR COALESCE(original,'') LIKE ${"%" + tag + "%"})`;
  for (const id of trainPairIds) await sql`DELETE FROM taste_pairs WHERE id=${id}`; // cascades taste_choices
  trainPairIds = [];
  check("train test data cleaned within run()", true);

  // ── 7. REHOOK (alternative opening lines) ────────────────────────────────
  section("7. Rehook (POST /api/rewrites/rehook)");
  const rehookRes = await api("POST", "/api/rewrites/rehook", {
    rewriteText:
      "We shipped a cleaner empty state today.\nIt took three tries.\nThe third one finally felt like us.",
    pillar: "design",
  });
  eq("POST rehook → 200", rehookRes.status, 200);
  const hooks = rehookRes.json?.hooks ?? [];
  check("rehook returns 1–3 hook options",
    Array.isArray(hooks) && hooks.length >= 1 && hooks.length <= 3, `got ${hooks.length}`);
  check("every hook has non-empty text",
    Array.isArray(hooks) && hooks.every((h: any) => typeof h?.text === "string" && h.text.trim().length > 0));
  const missingText = await api("POST", "/api/rewrites/rehook", { pillar: "design" });
  eq("rehook missing rewriteText → 400", missingText.status, 400);

  // ── 8. DELETE + UNTRAIN ─────────────────────────────────────────────────
  section("8. Delete + untrain");
  const flyBefore = await count(
    sql`SELECT count(*)::int c FROM taste_examples WHERE source='flywheel' AND source_post_id IN (${P.design}, ${P.company})`
  );
  eq("2 flywheel rows exist before delete", flyBefore, 2);

  // delete the reviewed design post (has rewrites, reactions, a flywheel row)
  const delD = await api("DELETE", `/api/posts?id=${P.design}`);
  eq("DELETE design → 200", delD.status, 200);
  eq("design post gone", await count(sql`SELECT count(*)::int c FROM posts WHERE id=${P.design}`), 0);
  eq("design rewrites gone", await count(sql`SELECT count(*)::int c FROM rewrites WHERE post_id=${P.design}`), 0);
  eq("design reactions gone", await count(sql`SELECT count(*)::int c FROM reactions WHERE post_id=${P.design}`), 0);
  eq("design flywheel example untrained", (await flywheelOf(P.design)).length, 0);

  // delete company (also had a flywheel row)
  await api("DELETE", `/api/posts?id=${P.company}`);
  eq("company flywheel example untrained", (await flywheelOf(P.company)).length, 0);

  // delete experiment (pending, no flywheel row — pure cascade path)
  const delE = await api("DELETE", `/api/posts?id=${P.experiment}`);
  eq("DELETE experiment (no flywheel) → 200", delE.status, 200);
  eq("experiment post gone", await count(sql`SELECT count(*)::int c FROM posts WHERE id=${P.experiment}`), 0);

  // deleting a non-existent post → 404
  const del404 = await api("DELETE", `/api/posts?id=${P.experiment}`);
  eq("re-delete missing post → 404", del404.status, 404);

  // ── 9. NO RESIDUE (tag-based — robust to concurrent data) ────────────────
  // Membership, not absolute totals: a /train pick lands as source='game' with
  // no source_post_id, so an absolute taste_examples count would be fragile.
  // Instead prove none of OUR tagged rows survive, in every table we touched.
  section("9. Zero residue (our test rows fully removed; seed untouched)");
  const like = (s: string) => `%${s}%`;
  eq("no e2e posts residue",
    await count(sql`SELECT count(*)::int c FROM posts WHERE body LIKE ${like(tag)}`), 0);
  eq("no e2e taste_examples residue",
    await count(sql`SELECT count(*)::int c FROM taste_examples
      WHERE approved_text LIKE ${like(tag)}
         OR COALESCE(original,'')  LIKE ${like(tag)}
         OR COALESCE(edit_notes,'') LIKE ${like(tag)}`), 0);
  eq("no e2e taste_pairs residue",
    await count(sql`SELECT count(*)::int c FROM taste_pairs
      WHERE left_text LIKE ${like(tag)} OR right_text LIKE ${like(tag)}`), 0);
  eq("no e2e taste_choices residue",
    await count(sql`SELECT count(*)::int c FROM taste_choices
      WHERE COALESCE(chosen_text,'') LIKE ${like(tag)}`), 0);
  eq("seed taste_examples intact",
    await count(sql`SELECT count(*)::int c FROM taste_examples WHERE source='seed'`), seedTaste);
}

run()
  .catch((e) => {
    check("test crashed (no exception)", false, String(e?.stack ?? e));
  })
  .finally(async () => {
    // Safety net: remove anything this run created, regardless of outcome.
    try {
      if (batchId) {
        const left = (await sql`SELECT id FROM posts WHERE batch_id=${batchId}`) as { id: string }[];
        for (const r of left) {
          await sql`DELETE FROM taste_examples WHERE source_post_id=${r.id}`;
          await sql`DELETE FROM posts WHERE id=${r.id}`;
        }
        await sql`DELETE FROM batches WHERE id=${batchId}`;
      }
      // /train residue: game promotions (no FK back to a post) by tag, then the
      // seeded pairs (deleting a pair cascades its taste_choices).
      await sql`DELETE FROM taste_examples WHERE source='game'
        AND (approved_text LIKE ${"%" + tag + "%"} OR COALESCE(original,'') LIKE ${"%" + tag + "%"})`;
      for (const id of trainPairIds) await sql`DELETE FROM taste_pairs WHERE id=${id}`;
      // Belt-and-suspenders: any tagged e2e pairs even if id tracking was lost.
      await sql`DELETE FROM taste_pairs WHERE source='e2e'
        AND (left_text LIKE ${"%" + tag + "%"} OR right_text LIKE ${"%" + tag + "%"})`;
    } catch (e) {
      console.log("cleanup warning:", String(e));
    }

    const failed = checks.filter((c) => !c.pass);
    console.log(`\n${checks.length - failed.length}/${checks.length} checks passed.`);
    if (failed.length) {
      console.log("\n🔴 RED — NOT safe to deploy. Failing checks:");
      for (const f of failed) console.log(`   - ${f.label}${f.info ? `  (${f.info})` : ""}`);
      process.exit(1);
    } else {
      console.log("\n🟢 GREEN — full loop verified end-to-end. Safe to deploy to prod.");
      process.exit(0);
    }
  });
