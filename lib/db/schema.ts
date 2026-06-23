// Database schema for the Bricx review tool (Drizzle + Neon Postgres).
//
// The spine of the "Compounding Taste Loop":
//   batches ──< posts ──< rewrites ──< reactions
//   taste_examples  (what retrieval reads; grows from picks)
//
// Every Divij signal (like / pick / edit / comment / disapprove) is one row in
// `reactions`. A `pick` (plus any edits/comments on it) is later promoted into
// `taste_examples` with source='flywheel' so the next critique is better-anchored.

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { type Pillar, DEFAULT_PILLAR } from "../pillars";

export type MediaItem = {
  type: "image" | "video";
  url: string;
  name?: string;
};

// A single "Upload for review" submission — groups the posts sent together.
export const batches = pgTable("batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  author: text("author").notNull().default("writer"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// One draft the writer submitted (text + attached media), shown as a tweet card.
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id").references(() => batches.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull().default(""),
    media: jsonb("media")
      .$type<MediaItem[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: text("status").notNull().default("pending"), // pending | reviewed
    // Which content pillar the writer tagged this draft with. Stored as a slug;
    // labels + display order live in lib/pillars.ts.
    pillar: text("pillar").$type<Pillar>().notNull().default(DEFAULT_PILLAR),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    // The review queue always filters on status × pillar — index both together.
    statusPillarIdx: index("posts_status_pillar_idx").on(t.status, t.pillar),
  })
);

// The three agent rewrites for a post (A minimal / B reangled / C sharpest),
// pre-generated at submit time so Divij's review page is instant.
export const rewrites = pgTable("rewrites", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  label: text("label").notNull(), // A | B | C
  text: text("text").notNull(),
  rationale: text("rationale"),
  publishScore: integer("publish_score"), // 0-100 from the founder-judge (nullable until judged)
  recommended: boolean("recommended").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Every Divij signal. type drives the meaning; payload carries comment/edit text.
//   like        -> soft positive on a rewrite
//   pick        -> the final choice for the post (can coexist with likes)
//   edit        -> Divij rewrote a line himself; payload = his text  (GOLD)
//   comment     -> Divij's reasoning; payload = the comment           (GOLD)
//   disapprove  -> negative on a rewrite
export const reactions = pgTable("reactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .references(() => posts.id, { onDelete: "cascade" })
    .notNull(),
  rewriteId: uuid("rewrite_id").references(() => rewrites.id, {
    onDelete: "cascade",
  }), // nullable: a pick references a rewrite, but keep room for post-level notes
  type: text("type").notNull(), // like | pick | edit | comment | disapprove
  payload: text("payload"), // comment text / edited line
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// What retrieval feeds the model. Seeded from examples.json; grows from picks.
export const tasteExamples = pgTable("taste_examples", {
  id: uuid("id").defaultRandom().primaryKey(),
  original: text("original"), // the "before" draft (nullable for approved captions)
  approvedText: text("approved_text").notNull(), // the on-voice "after"
  editNotes: text("edit_notes"), // why it changed — the highest-value signal
  category: text("category"),
  // Which content pillar this example belongs to (slug; see lib/pillars.ts).
  // Nullable: existing seeds are normalized by a backfill; null ⇒ treated as a
  // global fallback in retrieval. Flywheel + /train rows set this explicitly.
  pillar: text("pillar").$type<Pillar>(),
  source: text("source").notNull().default("seed"), // seed | flywheel | game
  status: text("status").notNull().default("approved"),
  // The post a flywheel example was promoted from. Null for seed rows. When a
  // writer deletes a draft, the FK cascade pulls this row too, so a deleted
  // post never lingers as training data.
  sourcePostId: uuid("source_post_id").references(() => posts.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ── /train calibration (the onboarding taste game) ──────────────────────────
// taste_pairs = pre-generated this-or-that pairs; each contrasts ONE axis pushed
// to opposite extremes, scoped to a pillar. taste_choices = Divij's picks (the
// training signal). A real pick also promotes its winning text into
// taste_examples(source='game', pillar=bucket) so /train feeds the live loop.

export const tastePairs = pgTable(
  "taste_pairs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pillar: text("pillar").$type<Pillar>().notNull(),
    axis: text("axis").notNull(), // hook | length | register | claim_density | opener | rhythm
    leftText: text("left_text").notNull(),
    rightText: text("right_text").notNull(),
    leftMeta: text("left_meta"), // which extreme this side is, e.g. "bold-claim"
    rightMeta: text("right_meta"), // e.g. "question"
    source: text("source").notNull().default("opus-seed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pillarAxisIdx: index("taste_pairs_pillar_axis_idx").on(t.pillar, t.axis),
  })
);

export const tasteChoices = pgTable("taste_choices", {
  id: uuid("id").defaultRandom().primaryKey(),
  pairId: uuid("pair_id")
    .references(() => tastePairs.id, { onDelete: "cascade" })
    .notNull(),
  // Denormalized from the pair so a slice survives even if the pair changes.
  pillar: text("pillar").$type<Pillar>().notNull(),
  axis: text("axis").notNull(),
  chosen: text("chosen").notNull(), // left | right | neither
  chosenText: text("chosen_text"), // the winning text (null when 'neither')
  strength: text("strength"), // mild | strong (nullable)
  reasonChip: text("reason_chip"), // one-tap "why" (nullable)
  note: text("note"), // optional free text (nullable, usually skipped)
  sessionId: uuid("session_id"), // groups one onboarding run (nullable)
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Relations (for Drizzle's query API: db.query.posts.findMany({ with: { rewrites } }))
export const batchesRelations = relations(batches, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  batch: one(batches, { fields: [posts.batchId], references: [batches.id] }),
  rewrites: many(rewrites),
  reactions: many(reactions),
}));

export const rewritesRelations = relations(rewrites, ({ one, many }) => ({
  post: one(posts, { fields: [rewrites.postId], references: [posts.id] }),
  reactions: many(reactions),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, { fields: [reactions.postId], references: [posts.id] }),
  rewrite: one(rewrites, {
    fields: [reactions.rewriteId],
    references: [rewrites.id],
  }),
}));

export const tastePairsRelations = relations(tastePairs, ({ many }) => ({
  choices: many(tasteChoices),
}));

export const tasteChoicesRelations = relations(tasteChoices, ({ one }) => ({
  pair: one(tastePairs, {
    fields: [tasteChoices.pairId],
    references: [tastePairs.id],
  }),
}));
