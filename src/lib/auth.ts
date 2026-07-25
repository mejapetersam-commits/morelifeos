import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/client";
import * as schema from "./db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db(), {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    // No email deliverability set up yet — accounts are usable immediately.
    // Add a verification email flow later if that's needed.
    requireEmailVerification: false,
  },
  session: {
    // 30-day sessions with a rolling refresh under 24h since this is a
    // personal finance app people expect to stay logged into.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
