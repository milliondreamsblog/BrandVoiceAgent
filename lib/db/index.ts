// Shared Neon Postgres client (Drizzle). Import { db } from "@/lib/db".
// Uses the HTTP driver — perfect for Vercel serverless functions: each query
// is one fetch, no connection pool to manage.

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set — add it to .env.local");
}

const sql = neon(url);
export const db = drizzle(sql, { schema });
export { schema };
