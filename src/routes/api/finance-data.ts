import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { financeData } from "@/lib/db/schema";

async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return session.user;
}

export const Route = createFileRoute("/api/finance-data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const rows = await db()
          .select()
          .from(financeData)
          .where(eq(financeData.userId, user.id))
          .limit(1);

        // No row yet just means this user hasn't saved anything to the
        // cloud — the client falls back to its default/local state.
        return Response.json({ data: rows[0]?.data ?? null });
      },

      PUT: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON body", { status: 400 });
        }

        await db()
          .insert(financeData)
          .values({ userId: user.id, data: body, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: financeData.userId,
            set: { data: body, updatedAt: new Date() },
          });

        return Response.json({ ok: true });
      },
    },
  },
});
