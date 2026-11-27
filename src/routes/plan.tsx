import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { CalendarDays, CheckSquare, Repeat2, Timer, ShieldCheck, Inbox, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/plan")({ component: Plan });

const items = [
  { title: "Calendar", description: "Your daily, weekly and monthly schedule. Calendar integration is not connected yet.", icon: CalendarDays, status: "Not connected" },
  { title: "Tasks", description: "A single place for actions, priorities and deadlines. A dedicated task manager is not implemented yet.", icon: CheckSquare, status: "Planned" },
  { title: "Routines", description: "Build repeatable daily and weekly routines without duplicating calendar events.", icon: Repeat2, status: "Planned" },
  { title: "Focus sessions", description: "Protect time for deep work and track the sessions you complete.", icon: Timer, status: "Planned" },
  { title: "75-day challenge", description: "Track only the commitments you choose and define as challenge rules. Setup is intentionally pending.", icon: ShieldCheck, status: "Rules needed" },
];

function Plan() {
  return (
    <AppShell>
      <SectionHeader title="Plan" description="Turn intentions into scheduled, actionable commitments." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Link to="/inbox" className="rounded-2xl border border-border/70 bg-surface-elevated p-5 transition-colors hover:border-ocean/50">
          <div className="flex items-center gap-2 text-sm font-semibold"><Inbox className="h-4 w-4 text-ocean" /> Quick capture inbox</div>
          <p className="mt-2 text-sm text-muted-foreground">Capture ideas and loose ends so they don't get lost.</p>
          <span className="mt-4 inline-block text-xs font-medium text-ocean">Open inbox →</span>
        </Link>
        <Link to="/reviews" className="rounded-2xl border border-border/70 bg-surface-elevated p-5 transition-colors hover:border-ocean/50">
          <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-ocean" /> Weekly reviews</div>
          <p className="mt-2 text-sm text-muted-foreground">Review financial activity and reflect on the week using the existing review workflow.</p>
          <span className="mt-4 inline-block text-xs font-medium text-ocean">Open reviews →</span>
        </Link>
      </div>
      <h2 className="mb-3 text-sm font-semibold">Planning tools</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item.title} className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold"><item.icon className="h-4 w-4 text-muted-foreground" />{item.title}</div>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-medium text-muted-foreground">{item.status}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 rounded-xl bg-accent/40 p-4 text-xs leading-relaxed text-muted-foreground">
        Source-of-truth rule: once calendar integration is built, calendar events will remain the schedule. The 75-day challenge will independently record whether selected challenge commitments were completed.
      </p>
    </AppShell>
  );
}
