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
 *   5. Delete + untrain    — DELETE removes the post, its rewrites, reactions,
 *                            AND its flywheel example; seed rows untouched
 *
 * Self-cleaning and idempotent: it creates its own throwaway batch, asserts via
 * membership (not absolute totals) so existing demo data is irrelevant, and
 * removes 100% of what it created in a finally block — safe to run before every
 * deploy. Never touches the 19 seed taste_examples or the demo posts.
 *
 * Run:   npm run test:e2e            (against the local dev server)
 *        E2E_BASE_URL=https://tone-app-phi.vercel.app npm run test:e2e
 *
 * Requires: the target app running, and DATABASE_URL in .env.local (the same
 * Neon DB the app uses).
 * ────────────────────────────────────────────────────────────────────────── */
import { neon } from "@neondatabase/serverless";
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

  // ── 6. DELETE + UNTRAIN ─────────────────────────────────────────────────
  section("6. Delete + untrain");
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

  // ── 7. NO RESIDUE ───────────────────────────────────────────────────────
  section("7. Zero residue (seed + demo data untouched)");
  eq("posts count back to baseline", await count(sql`SELECT count(*)::int c FROM posts`), startPosts);
  eq("taste_examples count back to baseline", await count(sql`SELECT count(*)::int c FROM taste_examples`), startTaste);
  eq("seed taste_examples intact", await count(sql`SELECT count(*)::int c FROM taste_examples WHERE source='seed'`), seedTaste);
}

run()
  .catch((e) => {
    check("test crashed (no exception)", false, String(e?.stack ?? e));
  })
  .finally(async () => {
    // Safety net: remove anything this run created, regardless of outcome.
    if (batchId) {
      try {
        const left = (await sql`SELECT id FROM posts WHERE batch_id=${batchId}`) as { id: string }[];
        for (const r of left) {
          await sql`DELETE FROM taste_examples WHERE source_post_id=${r.id}`;
          await sql`DELETE FROM posts WHERE id=${r.id}`;
        }
        await sql`DELETE FROM batches WHERE id=${batchId}`;
      } catch (e) {
        console.log("cleanup warning:", String(e));
      }
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
