import { createAuthClient } from "better-auth/react";

// Same-origin API routes (/api/auth/**) — no baseURL override needed in
// either dev or production.
export const authClient = createAuthClient();

export const { useSession, signIn, signUp, signOut } = authClient;
