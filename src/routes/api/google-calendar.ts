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

async function getAccessToken(headers: Headers, googleAccount: typeof account.$inferSelect) {
  const result = await auth.api.getAccessToken({
    body: { accountId: googleAccount.id },
    headers,
  });
  if (!result?.accessToken) throw new Error("Google access expired. Reconnect your account.");
  return result.accessToken;
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || new URL(origin).origin === new URL(request.url).origin;
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
          const token = await getAccessToken(request.headers, result.googleAccount);
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
        if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
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
        if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
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
        if (!isSameOrigin(request)) return new Response("Forbidden", { status: 403 });
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
            const token = await getAccessToken(request.headers, result.googleAccount);
            await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" } });
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
