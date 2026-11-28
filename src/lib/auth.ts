import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/client";
import * as schema from "./db/schema";

const previewOrigins = [
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  process.env.VERCEL_BRANCH_URL ? `https://${process.env.VERCEL_BRANCH_URL}` : undefined,
].filter((origin): origin is string => Boolean(origin));

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
  account: {
    // Calendar refresh/access tokens are sensitive credentials; encrypt them in the auth database.
    encryptOAuthTokens: true,
  },
  session: {
    // 30-day sessions with a rolling refresh under 24h since this is a
    // personal finance app people expect to stay logged into.
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  // Trust only the canonical app URL and exact Vercel-provided preview hosts.
  trustedOrigins: [process.env.BETTER_AUTH_URL, ...previewOrigins].filter(
    (origin): origin is string => Boolean(origin),
  ),
  baseURL: process.env.VERCEL_ENV === "preview" ? undefined : process.env.BETTER_AUTH_URL,
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            accessType: "offline",
            prompt: "select_account consent",
          },
        },
      }
    : {}),
});
