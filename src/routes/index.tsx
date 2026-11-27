import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { SectionTitle } from "@/components/finance-cards";
import { useFinance } from "@/lib/finance-store";
import { useSession } from "@/lib/auth-client";
import { computeMetrics, formatMoney, greeting } from "@/lib/finance-utils";
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, Wallet,
  Target, Sparkles, ClipboardCheck,
  Plus, ChevronRight, CalendarCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today | MoreLifeOS" },
      { name: "description", content: "Your personal command centre for daily execution, financial clarity and long-term growth." },
      { property: "og:title", content: "Today | MoreLifeOS" },
      { property: "og:description", content: "A calm command centre for what matters today and the life you are building." },
    ],
  }),
  component: Home,
});

function Home() {
  const { state } = useFinance();
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [detail, setDetail] = useState<null | "day" | "execution" | "review" | "growth">(null);
  const { data: session } = useSession();
  const now = new Date();
  const firstName = session?.user?.name?.split(" ")[0];
  const metrics = computeMetrics(state);
  const currency = state.profile.currency;
  const latestReview = state.reviews[0];
  const featuredGoal = state.goals[0];
  const goalProgress = featuredGoal && featuredGoal.target > 0
    ? Math.min(100, Math.round((featuredGoal.saved / featuredGoal.target) * 100))
    : 0;

  return (
    <AppShell>
      <Dialog open={challengeOpen} onOpenChange={setChallengeOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-border/70 p-6 sm:max-w-xl">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-sage/10 text-sage"><Target className="h-5 w-5" /></div>
            <DialogTitle className="font-display text-2xl">Your Consistency Challenge</DialogTitle>
            <DialogDescription className="leading-relaxed">A personal system built around the routines you want to sustain, not a copy of 75 Hard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-2xl border border-border/70 bg-surface p-4"><div className="text-sm font-semibold">1. Choose the commitments</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Define a small set of daily non-negotiables, such as your workout, focused work, a walk and learning. Only commitments you explicitly choose count toward the challenge.</p></div>
            <div className="rounded-2xl border border-border/70 bg-surface p-4"><div className="text-sm font-semibold">2. Decide the rules</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Set the start date, completion threshold, rest-day policy and what happens after a missed day. The tracker must follow your rules, not invent them.</p></div>
            <div className="rounded-2xl border border-border/70 bg-surface p-4"><div className="text-sm font-semibold">3. Track evidence, not intentions</div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Planned calendar events stay separate from completed actions. Your streak, day count and milestone celebrations will update only from recorded execution.</p></div>
            <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">The challenge is not active yet. We still need to lock the rules before day 1, so no progress or streak is being fabricated.</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={() => setChallengeOpen(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-accent">Close</button><Link to="/plan" onClick={() => setChallengeOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sage px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:brightness-105">View Plan <ArrowRight className="h-4 w-4" /></Link></div>
        </DialogContent>
      </Dialog>
      <Dialog open={detail !== null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="rounded-3xl border-border/70 p-6 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{detail === "day" ? "Your day, at a glance" : detail === "execution" ? "Daily execution" : detail === "review" ? "Weekly review" : "Goals & growth"}</DialogTitle>
            <DialogDescription>{detail === "day" ? "Your calendar is the source of truth for planned time." : detail === "execution" ? "Record what happened separately from what was scheduled." : detail === "review" ? "Review the week using actual activity and reflections." : "Connect the actions you take today to the outcomes you want."}</DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-surface p-4 text-sm leading-relaxed text-muted-foreground">{detail === "day" ? "Google Calendar is selected, but authorisation is still required. Once connected, real events will appear here; this panel will not create duplicate calendar entries." : detail === "execution" ? "Execution tracking is not connected yet. The dashboard will not mark an item complete just because it was on your calendar." : detail === "review" ? (latestReview ? "Your latest saved review is available in the Reviews section." : "No weekly review has been recorded yet. Start one when you are ready to reflect on the week.") : (featuredGoal ? `Your current featured goal is ${featuredGoal.name}. Open Growth to manage its progress and milestones.` : "You have not added a goal yet. Add one in Growth to make progress visible here.")}</div>
          <div className="flex justify-end"><button onClick={() => setDetail(null)} className="rounded-xl bg-sage px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-105">Got it</button></div>
        </DialogContent>
      </Dialog>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
            <h1 className="mt-2 font-display text-[32px] font-bold tracking-[-0.045em] md:text-[42px]">
              {greeting(now, firstName)}<span className="text-sage">.</span>
            </h1>
            <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">A clearer view of what matters today and where your time is going.</p>
          </div>
          <Link to="/plan" className="inline-flex w-fit items-center gap-2 rounded-xl bg-sage px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition-all hover:-translate-y-0.5 hover:brightness-105">
            <Plus className="h-4 w-4" /> Plan my day
          </Link>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
          <div className="dashboard-card overflow-hidden rounded-[24px] border border-border/80 bg-surface-elevated shadow-soft">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 md:px-6">
              <div>
                <button onClick={() => setDetail("day")} className="flex items-center gap-2 text-sm font-semibold transition hover:text-sage"><CalendarDays className="h-4 w-4 text-ocean" /> My day <span className="text-[10px] font-medium text-muted-foreground">Details</span></button>
                <p className="mt-1 text-xs text-muted-foreground">Your schedule, in one clear timeline</p>
              </div>
              <Link to="/plan" className="text-xs font-semibold text-sage hover:opacity-75">Calendar setup <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
            </div>
            <div className="p-5 md:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/80 px-3 py-1.5 text-[11px] font-medium text-foreground/75">
                  <CalendarCheck className="h-3.5 w-3.5 text-ocean" /> Google Calendar
                </span>
                <span className="text-[11px] text-muted-foreground">mejapetersam@gmail.com</span>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium text-amber-700 dark:text-amber-300">Connection setup required</span>
              </div>
              <div className="relative rounded-2xl bg-background/80 px-4 py-8 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-sage/10 text-sage"><CalendarDays className="h-5 w-5" /></div>
                <p className="mt-3 text-sm font-semibold">Your calendar will appear here</p>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                  Google Calendar is selected as your primary calendar. Connect authorisation to bring in today's real events.
                </p>
                <Link to="/plan" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sage">View connection status <ArrowRight className="h-3 w-3" /></Link>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <MiniStat label="Scheduled" value="Not connected" />
                <MiniStat label="Completed" value="Not tracked" />
                <MiniStat label="Remaining" value="Not tracked" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="dashboard-card relative overflow-hidden rounded-[24px] bg-[#17233B] p-5 text-white shadow-soft md:p-6">
              <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full border-[22px] border-white/5" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold tracking-tight"><Target className="h-4 w-4 text-[#A8D2BA]" /> Consistency Challenge</div>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-white/75">Not started</span>
              </div>
              <div className="relative mt-6 flex items-end justify-between">
                <div>
                  <div className="font-display text-2xl font-semibold">Setup pending</div>
                  <p className="mt-2 text-xs text-white/65">Your personal consistency challenge</p>
                </div>
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-white/15 text-[10px] font-semibold text-white/70">Not active</div>
              </div>
              <div className="relative mt-5 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full w-0 rounded-full bg-[#B8C5FF]" /></div>
              <button onClick={() => setChallengeOpen(true)} className="relative mt-5 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-[#D8DEFF] transition hover:translate-x-1 hover:text-white">Explore challenge <ArrowRight className="h-3 w-3" /></button>
            </div>

            <div className="rounded-[24px] border border-border/80 bg-surface-elevated p-5 shadow-soft md:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold tracking-tight"><CheckCircle2 className="h-4 w-4 text-sage" /> Daily execution</div>
                <span className="text-[10px] font-medium text-muted-foreground">Today</span>
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-xl font-semibold">Not tracked</span>
                <span className="pb-1 text-xs text-muted-foreground">commitments completed</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent"><div className="h-full w-0 rounded-full bg-sage" /></div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Execution tracking will measure what you actually complete, separately from what was planned.</p>
<button onClick={() => setDetail("execution")} className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-sage">View details <ArrowRight className="h-3 w-3" /></button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-[24px] border border-border/80 bg-surface-elevated p-5 shadow-soft md:p-6">
            <SectionTitle eyebrow="Look back, move forward" title="Weekly review" />
            {latestReview ? (
              <div className="rounded-2xl bg-background/80 p-4">
                <div className="text-xs text-muted-foreground">Latest review · week of {new Date(latestReview.weekOf).toLocaleDateString()}</div>
                <p className="mt-2 text-sm font-medium">Your latest reflection is ready to revisit.</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardCheck className="h-4 w-4 text-ocean" /> Your week, with perspective</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your weekly review will bring together consistency, completed commitments and lessons learned once execution tracking is active.</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4"><Link to="/reviews" className="inline-flex items-center gap-1 text-xs font-semibold text-sage">Open weekly reviews <ChevronRight className="h-3 w-3" /></Link><button onClick={() => setDetail("review")} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Quick view</button></div>
          </div>

          <div className="rounded-[24px] border border-border/80 bg-surface-elevated p-5 shadow-soft md:p-6">
            <SectionTitle eyebrow="Long-term direction" title="Goals & growth" />
            {featuredGoal ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{featuredGoal.name}</span>
                  <span className="text-xs font-semibold text-sage">{goalProgress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent"><div className="h-full rounded-full bg-ocean transition-all" style={{ width: goalProgress + "%" }} /></div>
                <p className="mt-2 text-xs text-muted-foreground">{formatMoney(featuredGoal.saved, currency)} of {formatMoney(featuredGoal.target, currency)}</p>
              </>
            ) : (
              <div className="rounded-2xl bg-background/80 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-ocean" /> Make progress visible</div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Your goals, learning and milestones will live here, connected to the actions you take every day.</p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-4"><Link to="/growth" className="inline-flex items-center gap-1 text-xs font-semibold text-sage">Explore Growth <ChevronRight className="h-3 w-3" /></Link><button onClick={() => setDetail("growth")} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Quick view</button></div>
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <SectionTitle eyebrow="Financial snapshot" title="Money at a glance" />
            <Link to="/money" className="mb-5 text-xs font-semibold text-sage">Open Money <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <FinanceMetric label="Net worth" value={formatMoney(metrics.netWorth, currency)} detail="Across tracked accounts" />
            <FinanceMetric label="Available cash" value={formatMoney(metrics.availableCash, currency)} detail="Cash and bank balances" />
            <FinanceMetric label="Monthly surplus" value={formatMoney(metrics.monthIncome - metrics.monthExpenses, currency)} detail="Income less expenses" />
          </div>
        </section>

        <section>
          <SectionTitle eyebrow="Make the next move" title="Quick actions" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickAction to="/plan" icon={CalendarDays} label="Plan my day" />
            <QuickAction to="/money" icon={Wallet} label="Add transaction" />
            <QuickAction to="/growth" icon={Target} label="Set a goal" />
            <QuickAction to="/intelligence" icon={Sparkles} label="Ask Intelligence" />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-background/70 px-3 py-2.5"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 break-words text-[11px] font-semibold leading-tight">{value}</div></div>;
}
function FinanceMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border border-border/80 bg-surface-elevated p-4 transition-colors hover:border-sage/40 md:p-5"><div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</div><div className="mt-2 truncate font-display text-xl font-semibold tracking-tight md:text-2xl">{value}</div><div className="mt-1 text-[11px] text-muted-foreground">{detail}</div></div>;
}
function QuickAction({ to, icon: Icon, label }: { to: "/plan" | "/money" | "/growth" | "/intelligence"; icon: typeof CalendarDays; label: string }) {
  return <Link to={to} className="group flex items-center justify-between gap-2 rounded-2xl border border-border/80 bg-surface-elevated p-4 text-sm font-medium shadow-soft transition-all hover:-translate-y-0.5 hover:border-sage/40 hover:shadow-lift"><span className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage/10 text-sage"><Icon className="h-4 w-4" /></span>{label}</span><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-ocean" /></Link>;
}
