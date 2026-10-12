import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// No "server-only" here: scripts/seed.ts runs this under plain Node. App code
// should only reach the DB through lib/queries and lib/actions, which are
// server-only and call requireSession() first.

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error("DATABASE_URL is not set.");
  return drizzle({ client: neon(url), schema });
}

let cached: ReturnType<typeof createDb> | undefined;

/** Lazily created so importing this module never needs the env at build time. */
export function getDb() {
  return (cached ??= createDb());
}

export type Db = ReturnType<typeof createDb>;
