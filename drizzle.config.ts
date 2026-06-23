import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

// drizzle-kit runs outside Next.js, so load .env.local manually.
dotenv.config({ path: ".env.local" });

// Use the unpooled (direct) connection for DDL/migrations — Neon recommends it.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) in .env.local");
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
} satisfies Config;
