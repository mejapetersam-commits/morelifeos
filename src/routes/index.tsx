import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OnboardingModal } from "@/components/OnboardingModal";
import { SectionTitle } from "@/components/finance-cards";
import { useFinance } from "@/lib/finance-store";
import { useSession } from "@/lib/auth-client";
import { computeMetrics, formatMoney, greeting } from "@/lib/finance-utils";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Wallet,
  Target,
  Sparkles,
  Dumbbell,
  BookOpen,
  Footprints,
  ClipboardCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — MoreLifeOS" },
      {
        name: "description",
        content: "Your personal command centre for daily execution, financial clarity and long-term growth.",
      },
      { property: "og:title", content: "Today — MoreLifeOS" },
      {
        property: "og:description",
        content: "A calm command centre for what matters today and the life you are building.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { state } = useFinance();
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
    <>
      <OnboardingModal />
      <AppShell>
        <section className="mb-7">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            {greeting(now, firstName)}.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A clear view of today's commitments, your progress and what deserves your attention.
          </p>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-ocean" /> My day</div>
              <Link to="/plan" className="text-xs font-medium text-ocean hover:opacity-80">Open Plan <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
            </div>
            <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center">
              <Clock3 className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Your schedule will appear here</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                Calendar integration is not connected yet. We won't invent events or show sample activities as if they're yours.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-ocean" /> 75-day challenge</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <div className="font-display text-2xl font-semibold">Not started</div>
                  <p className="mt-1 text-xs text-muted-foreground">Rules and start date need to be defined.</p>
                </div>
                <Link to="/plan" className="shrink-0 text-xs font-medium text-ocean">Set up <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
              <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-ocean" /> Daily execution</div>
              <p className="mt-3 text-sm font-medium">Tracking not enabled</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Planned activities and completed actions will be recorded separately once the execution tracker is in place.</p>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <SectionTitle eyebrow="Consistency" title="Weekly review" />
            {latestReview ? (
              <>
                <p className="text-sm text-muted-foreground">Your latest review was recorded for the week of {new Date(latestReview.weekOf).toLocaleDateString()}.</p>
                <Link to="/reviews" className="mt-4 inline-flex items-center text-xs font-medium text-ocean">Review your history <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">No review has been recorded yet. Weekly reflections will become more useful once daily execution data is available.</p>
                <Link to="/reviews" className="mt-4 inline-flex items-center text-xs font-medium text-ocean">Open reviews <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-border/70 bg-surface-elevated p-5">
            <SectionTitle eyebrow="Growth" title="Goals & milestones" />
            {featuredGoal ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold">{featuredGoal.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">{goalProgress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent"><div className="h-full rounded-full bg-ocean" style={{ width: goalProgress + "%" }} /></div>
                <Link to="/growth" className="mt-4 inline-flex items-center text-xs font-medium text-ocean">Open Growth <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">Your goals will appear here and connect daily actions to longer-term outcomes.</p>
                <Link to="/growth" className="mt-4 inline-flex items-center text-xs font-medium text-ocean">Explore Growth <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
              </>
            )}
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle eyebrow="Financial snapshot" title="Your money, at a glance" />
            <Link to="/money" className="text-xs font-medium text-ocean">Open Money <ArrowUpRight className="ml-1 inline h-3 w-3" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Metric label="Net worth" value={formatMoney(metrics.netWorth, currency)} />
            <Metric label="Available cash" value={formatMoney(metrics.availableCash, currency)} />
            <Metric label="This month's surplus" value={formatMoney(metrics.monthIncome - metrics.monthExpenses, currency)} />
          </div>
        </section>

        <section className="mb-5">
          <SectionTitle eyebrow="Shortcuts" title="Quick actions" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Action to="/plan" icon={CalendarDays} label="Plan my day" />
            <Action to="/money" icon={Wallet} label="Add transaction" />
            <Action to="/growth" icon={Target} label="Set a goal" />
            <Action to="/intelligence" icon={Sparkles} label="View intelligence" />
          </div>
        </section>

        <section className="rounded-2xl bg-accent/35 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-surface-elevated p-2"><ClipboardCheck className="h-4 w-4 text-muted-foreground" /></div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Build for decisions, not data.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">MoreLifeOS should help you follow through, understand your patterns and make better decisions — without becoming another system you spend all day maintaining.</p>
            </div>
          </div>
        </section>
      </AppShell>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface-elevated p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 truncate font-display text-xl font-semibold num">{value}</div>
    </div>
  );
}

function Action({ to, icon: Icon, label }: { to: "/plan" | "/money" | "/growth" | "/intelligence"; icon: typeof CalendarDays; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface-elevated p-4 text-sm font-medium transition-colors hover:border-ocean/50 hover:bg-accent/40">
      <Icon className="h-4 w-4 shrink-0 text-ocean" />
      <span>{label}</span>
    </Link>
  );
}
