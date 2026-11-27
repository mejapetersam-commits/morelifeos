import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { account } from "@/lib/db/schema";

async function getGoogleAccount(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { response: new Response("Unauthorized", { status: 401 }) } as const;
  const [googleAccount] = await db()
    .select()
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, "google")))
    .limit(1);
  return { userId: session.user.id, googleAccount } as const;
}

async function getAccessToken(userId: string, googleAccount: typeof account.$inferSelect) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth is not configured.");
  if (googleAccount.accessToken && googleAccount.accessTokenExpiresAt &&
      googleAccount.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return googleAccount.accessToken;
  }
  if (!googleAccount.refreshToken) throw new Error("Google access expired. Reconnect your account.");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: googleAccount.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const tokens = await response.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!response.ok || !tokens.access_token) throw new Error(tokens.error || "Google token refresh failed.");
  await db().update(account).set({
    accessToken: tokens.access_token,
    accessTokenExpiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
    updatedAt: new Date(),
  }).where(and(eq(account.id, googleAccount.id), eq(account.userId, userId)));
  return tokens.access_token;
}

async function googleRequest(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: { message?: string } }).error?.message || "Google Calendar request failed.");
  return payload;
}

export const Route = createFileRoute("/api/google-calendar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const result = await getGoogleAccount(request);
        if ("response" in result) return result.response;
        const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
        if (!configured) return Response.json({ configured: false, connected: false });
        if (!result.googleAccount) return Response.json({ configured: true, connected: false });
        const url = new URL(request.url);
        try {
          const token = await getAccessToken(result.userId, result.googleAccount);
          const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
          const timeMax = url.searchParams.get("timeMax") || new Date(Date.now() + 7 * 86400000).toISOString();
          const events = await googleRequest(
            `/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=50&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`,
            token,
          );
          return Response.json({ configured: true, connected: true, events });
        } catch (error) {
          return Response.json({ configured: true, connected: true, error: error instanceof Error ? error.message : "Calendar unavailable." }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        const result = await getGoogleAccount(request);
        if ("response" in result) return result.response;
        if (!result.googleAccount) return new Response("Google Calendar is not connected.", { status: 409 });
        try {
          const body = await request.json() as { summary?: string; description?: string; start?: { dateTime?: string; date?: string; timeZone?: string }; end?: { dateTime?: string; date?: string; timeZone?: string } };
          if (!body.summary?.trim() || !body.start || !body.end) return new Response("Event title, start and end are required.", { status: 400 });
          const token = await getAccessToken(result.userId, result.googleAccount);
          const event = await googleRequest("/calendars/primary/events", token, { method: "POST", body: JSON.stringify(body) });
          return Response.json({ event }, { status: 201 });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Could not create event." }, { status: 502 });
        }
      },
      PATCH: async ({ request }) => {
        const result = await getGoogleAccount(request);
        if ("response" in result) return result.response;
        if (!result.googleAccount) return new Response("Google Calendar is not connected.", { status: 409 });
        try {
          const body = await request.json() as { eventId?: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string; timeZone?: string }; end?: { dateTime?: string; date?: string; timeZone?: string } };
          if (!body.eventId) return new Response("Event ID is required.", { status: 400 });
          const { eventId, ...patch } = body;
          const token = await getAccessToken(result.userId, result.googleAccount);
          const event = await googleRequest(`/calendars/primary/events/${encodeURIComponent(eventId)}`, token, { method: "PATCH", body: JSON.stringify(patch) });
          return Response.json({ event });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Could not update event." }, { status: 502 });
        }
      },
      DELETE: async ({ request }) => {
        const result = await getGoogleAccount(request);
        if ("response" in result) return result.response;
        if (!result.googleAccount) return Response.json({ ok: true });
        const url = new URL(request.url);
        const eventId = url.searchParams.get("eventId");
        try {
          if (eventId) {
            const token = await getAccessToken(result.userId, result.googleAccount);
            await googleRequest(`/calendars/primary/events/${encodeURIComponent(eventId)}`, token, { method: "DELETE" });
          } else {
            const token = result.googleAccount.refreshToken || result.googleAccount.accessToken;
            if (token) {
              await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } });
            }
            await db().delete(account).where(and(eq(account.id, result.googleAccount.id), eq(account.userId, result.userId)));
          }
          return Response.json({ ok: true });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "Calendar action failed." }, { status: 502 });
        }
      },
    },
  },
});
