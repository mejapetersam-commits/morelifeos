import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// @neondatabase/serverless talks to Neon over HTTP, which works on
// Cloudflare Workers (this app's deploy target) where a normal TCP
// Postgres driver would not.
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it as an environment variable (Neon connection string) " +
        "in your deployment settings and in a local .env file for `bun run dev`.",
    );
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

let cached: ReturnType<typeof getDb> | undefined;

export function db() {
  if (!cached) cached = getDb();
  return cached;
}
