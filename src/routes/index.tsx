import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { goalFunding } from "@/lib/allocations";
import { useSession } from "@/lib/auth-client";
import {
  computeMetrics,
  computeSafeToSpend,
  formatMoney,
  generateInsights,
  goalEta,
  greeting,
  pct,
} from "@/lib/finance-utils";
import { computeHealthScore } from "@/lib/health-score";
import { AnimatedMoney, KpiCard, ProgressRing, SectionTitle } from "@/components/finance-cards";
import {
  ArrowUpRight,
  Plus,
  Wallet,
  Target,
  PiggyBank,
  Repeat,
  Sparkles,
  CalendarClock,
  TrendingUp,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Account } from "@/lib/finance-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — FinanceOS | More LifeOS" },
      {
        name: "description",
        content:
          "Your personal financial operating system. Understand your position, act on intelligent insights, and build long-term wealth with calm clarity.",
      },
      { property: "og:title", content: "Overview — FinanceOS | More LifeOS" },
      {
        property: "og:description",
        content:
          "A calm, intelligent overview of your financial life. Everything is under control.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { state, setProfile, addTransaction } = useFinance();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0];
  const m = computeMetrics(state);
  const insights = generateInsights(state, m);
  const currency = state.profile.currency;

  const netWorth = m.netWorth;
  const monthlySurplus = m.monthIncome - m.monthExpenses;
  const surplusEstimate = monthlySurplus > 0 ? monthlySurplus : m.monthIncome * 0.1;
  const sts = computeSafeToSpend(state, m.availableCash);
  // Multi-factor, explainable score (src/lib/health-score.ts). Every point is
  // traceable to a named factor, so the card can say WHY the number moved.
  const healthResult = computeHealthScore(state, m);
  const health = healthResult?.score ?? null;
  const now = new Date();
  const hero = heroCopy(state, m);

  // Upcoming bills — sourced from real recurring transactions (Money > Recurring)
  const bills = deriveUpcomingBills(state);

  const topGoal = state.goals[0];
  const topGoalFunding = topGoal ? goalFunding(topGoal, state.allocations, state.accounts) : null;
  const eta =
    topGoal && topGoalFunding
      ? goalEta({ ...topGoal, saved: topGoalFunding.funded }, surplusEstimate)
      : null;

  // Reflection banner only shows when a review is actually due — no
  // reviews yet, or the most recent one is 7+ days old.
  const [reflectionDismissed, setReflectionDismissed] = useState(false);
  const lastReview = state.reviews[0];
  const daysSinceLastReview = lastReview
    ? (now.getTime() - new Date(lastReview.weekOf).getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;
  const reviewDue = daysSinceLastReview >= 7;

  return (
    <>
      <OnboardingModal />
      <AppShell>
        {/* ─── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-ocean via-ocean to-[oklch(0.28_0.06_255)] p-5 text-ocean-foreground shadow-hero md:p-7">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-sage/15 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-ocean-foreground/60">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              {now.toLocaleDateString(undefined, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
            <h1 className="mt-2 max-w-2xl font-display text-2xl font-semibold leading-[1.15] tracking-tight md:text-[28px]">
              {greeting(new Date(), firstName)}.
              <br />
              <span className="text-ocean-foreground/80">{hero.headline}</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ocean-foreground/70">
              {hero.body}
            </p>
          </div>
        </section>

        {/* ─── Safe to Spend ───────────────────────────────────── */}
        <section className="mt-5">
          <div className="rounded-3xl bg-surface-elevated p-5 shadow-soft">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Safe to spend
                </div>
                <div
                  className={`mt-1 font-display text-3xl font-semibold num ${
                    sts.safeToSpend < 0 ? "text-coral" : ""
                  }`}
                >
                  {formatMoney(sts.safeToSpend, currency)}
                </div>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  {sts.safeToSpend >= 0
                    ? "What's left to spend after bills due in the next 30 days and this month's goal contributions."
                    : "Bills and goal contributions due soon add up to more than your available cash right now — worth a look before spending freely."}
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Liquid balance</div>
                  <div className="num font-medium">{formatMoney(sts.liquidBalance, currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Bills (30d)</div>
                  <div className="num font-medium text-coral">
                    − {formatMoney(sts.upcomingBills, currency)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Goal reserve</div>
                  <div className="num font-medium text-royal">
                    − {formatMoney(sts.goalReserve, currency)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── KPI Cards ───────────────────────────────────────── */}
        <section className="mt-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              compact
              label="Net Worth"
              accent="ocean"
              value={<AnimatedMoney value={netWorth} currency={currency} />}
              delta={pct(netWorth, netWorth - monthlySurplus)}
            />
            <KpiCard
              compact
              label="Available Cash"
              accent="sage"
              value={<AnimatedMoney value={m.availableCash} currency={currency} />}
            />
            <KpiCard
              compact
              label="Financial Health"
              accent="royal"
              value={
                <span>
                  <span className="num">{health ?? "—"}</span>
                  <span className="ml-1 text-sm font-normal text-muted-foreground">/ 100</span>
                </span>
              }
            />
            <DebtCard
              debt={state.profile.debt}
              currency={currency}
              accounts={state.accounts}
              onSave={(debt) => setProfile({ debt })}
              onRepay={(accountId, amount) => {
                addTransaction({
                  type: "expense",
                  amount,
                  category: "Debt",
                  accountId,
                  date: new Date().toISOString(),
                  description: "Debt repayment",
                });
                setProfile({ debt: Math.max(0, state.profile.debt - amount) });
              }}
            />
          </div>
        </section>

        {/* ─── Financial Intelligence ──────────────────────────── */}
        {insights.length > 0 && (
          <section className="mt-5">
            <SectionTitle
              eyebrow="Financial Intelligence"
              title="What deserves your attention"
              action={
                <Link
                  to="/ai"
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo hover:opacity-80"
                >
                  See all insights <ArrowUpRight className="h-4 w-4" />
                </Link>
              }
            />
            <div className="relative overflow-hidden rounded-3xl bg-surface-elevated p-5 shadow-lift">
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo/10 blur-3xl" />
              <div className="relative max-w-xl">
                <IntelligenceItem insight={insights[0]} index={0} />
              </div>
              <p className="relative mt-8 text-[12px] italic text-muted-foreground">
                FinanceOS observes and explains. You decide.
              </p>
            </div>
          </section>
        )}

        {/* ─── Goal + Upcoming Bills ───────────────────────────── */}
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl bg-surface-elevated p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Goal Progress
              </div>
              <Link to="/goals" className="text-xs font-medium text-royal hover:opacity-80">
                All goals →
              </Link>
            </div>
            {topGoal && topGoalFunding ? (
              <div className="mt-6 flex flex-col items-center text-center">
                <ProgressRing
                  progress={topGoalFunding.percent / 100}
                  accent="royal"
                  label={topGoal.name}
                />
                <div className="mt-5 font-display text-xl font-semibold">{topGoal.name}</div>
                <div className="mt-4 grid w-full grid-cols-3 gap-2 text-left">
                  <GoalFigure label="Target" value={formatMoney(topGoal.target, currency)} />
                  <GoalFigure
                    label="Allocated"
                    value={formatMoney(topGoalFunding.funded, currency)}
                  />
                  <GoalFigure
                    label="Remaining"
                    value={formatMoney(topGoalFunding.remaining, currency)}
                  />
                </div>
                {eta && eta.date && (
                  <div className="mt-4 rounded-full bg-royal/8 px-3 py-1.5 text-[12px] font-medium text-royal">
                    Expected:{" "}
                    {eta.date.toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                )}
                <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                  {topGoalFunding.allocated > 0
                    ? `${formatMoney(topGoalFunding.allocated, currency)} of your existing balances is assigned to this goal — the money hasn't moved, it's just spoken for.`
                    : `At an estimated ${formatMoney(surplusEstimate, currency)} / month, you're on a steady path.`}
                </p>
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="Every journey begins with one smart decision."
                body="Goals give money direction. Even one clear goal changes how everyday choices feel."
                cta={{ to: "/goals", label: "Create your first goal" }}
              />
            )}
          </div>
          <div className="rounded-3xl bg-surface-elevated p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Upcoming Bills
                </div>
                <h3 className="mt-1 font-display text-xl font-semibold">Coming up</h3>
              </div>
              <Link to="/money" className="text-xs font-medium text-ocean hover:opacity-80">
                Manage →
              </Link>
            </div>
            <div className="mt-5 space-y-3">
              {bills.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="Nothing pending."
                  body="Add a recurring expense on the Money page and it'll appear here automatically."
                  cta={{ to: "/money", label: "Add recurring expense" }}
                />
              ) : (
                bills.map((b) => <BillRow key={b.id} bill={b} currency={currency} />)
              )}
            </div>
          </div>
        </section>

        {/* ─── Quick Actions ───────────────────────────────────── */}
        <section className="mt-5">
          <SectionTitle eyebrow="Shortcuts" title="Quick actions" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <QuickAction to="/money" icon={Plus} label="Add Transaction" accent="ocean" />
            <QuickAction to="/money" icon={Wallet} label="New Account" accent="sage" />
            <QuickAction to="/money" icon={Repeat} label="Transfer" accent="royal" />
            <QuickAction to="/goals" icon={Target} label="Set Goal" accent="gold" />
            <QuickAction to="/money" icon={PiggyBank} label="To Savings" accent="emerald" />
            <QuickAction to="/ai" icon={Sparkles} label="Ask Intelligence" accent="indigo" />
          </div>
        </section>

        {/* ─── Reflection banner (only when a review is due) ──── */}
        {reviewDue && !reflectionDismissed && (
          <section className="mt-8">
            <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-surface px-5 py-4 shadow-soft">
              <ShieldCheck className="h-5 w-5 shrink-0 text-sage" />
              <p className="min-w-0 flex-1 text-sm text-foreground/80">
                <span className="font-medium">A weekly review is due.</span>{" "}
                <span className="text-muted-foreground">
                  A few quiet minutes now makes next week's decisions easier.
                </span>
              </p>
              <Link
                to="/reviews"
                className="shrink-0 rounded-full bg-ocean px-4 py-1.5 text-xs font-medium text-ocean-foreground shadow-soft hover:shadow-lift"
              >
                Start review
              </Link>
              <button
                onClick={() => setReflectionDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}
      </AppShell>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components

function IntelligenceItem({
  insight,
  index,
}: {
  insight: ReturnType<typeof generateInsights>[number];
  index: number;
}) {
  const dotClass =
    insight.tone === "positive"
      ? "bg-sage"
      : insight.tone === "attention"
        ? "bg-amber"
        : "bg-indigo";
  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {insight.tone === "positive"
            ? "Momentum"
            : insight.tone === "attention"
              ? "Attention"
              : "Reflection"}
        </span>
      </div>
      <p className="mt-3 font-display text-[17px] font-semibold leading-snug">
        {insight.observation}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {insight.explanation}
      </p>
      {insight.options[0] && (
        <div className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-indigo">
          <TrendingUp className="h-3.5 w-3.5" /> {insight.options[0]}
        </div>
      )}
    </div>
  );
}

function TxRow({
  tx,
  currency,
}: {
  tx: ReturnType<typeof useFinance>["state"]["transactions"][number];
  currency: string;
}) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const color = isIncome ? "text-sage" : isTransfer ? "text-royal" : "text-foreground";
  const bg = isIncome
    ? "bg-sage/10 text-sage"
    : isTransfer
      ? "bg-royal/10 text-royal"
      : tx.type === "investment"
        ? "bg-indigo/10 text-indigo"
        : "bg-coral/10 text-coral";
  const sign = isIncome ? "+" : "−";
  const d = new Date(tx.date);
  const dayLabel = relativeDay(d);
  return (
    <li className="flex items-center gap-4 py-3.5">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium",
          bg,
        )}
      >
        {tx.category?.slice(0, 1).toUpperCase() ?? "•"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">
          {tx.description || tx.category || tx.type}
        </div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">
          {dayLabel} · {tx.category}
        </div>
      </div>
      <div className={cn("num text-[14px] font-semibold tabular-nums", color)}>
        {sign} {currency} {Math.round(tx.amount).toLocaleString()}
      </div>
    </li>
  );
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  due: Date;
  status: "upcoming" | "soon" | "overdue";
}

/**
 * Upcoming bills, sourced from real recurring transactions set up on the
 * Money > Recurring tab (frequency, nextDate, active) — no pattern-guessing.
 */
function deriveUpcomingBills(state: ReturnType<typeof useFinance>["state"]): Bill[] {
  const now = Date.now();
  return state.recurring
    .filter((r) => r.active && r.type === "expense")
    .map((r) => {
      const due = new Date(r.nextDate);
      const days = (due.getTime() - now) / (1000 * 60 * 60 * 24);
      const status: Bill["status"] = days < 0 ? "overdue" : days <= 5 ? "soon" : "upcoming";
      return {
        id: r.id,
        name: r.description || r.category,
        amount: r.amount,
        due,
        status,
      };
    })
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .slice(0, 4);
}

function BillRow({ bill, currency }: { bill: Bill; currency: string }) {
  const badge =
    bill.status === "overdue"
      ? "bg-amber/12 text-amber"
      : bill.status === "soon"
        ? "bg-gold/12 text-gold"
        : "bg-muted text-muted-foreground";
  const badgeText =
    bill.status === "overdue" ? "Past due" : bill.status === "soon" ? "Due soon" : "Upcoming";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/50 bg-background/50 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-[14px] font-medium">{bill.name}</div>
        <div className="mt-0.5 text-[12px] text-muted-foreground">
          {bill.due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="num text-[14px] font-semibold">
          {currency} {Math.round(bill.amount).toLocaleString()}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest",
            badge,
          )}
        >
          {badgeText}
        </span>
      </div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  accent,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  accent: "ocean" | "sage" | "gold" | "royal" | "emerald" | "indigo";
}) {
  const bg = {
    ocean: "bg-ocean/10 text-ocean",
    sage: "bg-sage/12 text-sage",
    gold: "bg-gold/12 text-gold",
    royal: "bg-royal/10 text-royal",
    emerald: "bg-emerald/12 text-emerald",
    indigo: "bg-indigo/10 text-indigo",
  }[accent];
  return (
    <Link
      to={to}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-border/50 bg-surface-elevated p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", bg)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-[13px] font-medium leading-tight">{label}</div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-3 py-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-display text-[15px] font-semibold leading-snug">{title}</div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-ocean hover:opacity-80"
        >
          {cta.label} <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

function relativeDay(d: Date) {
  const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function heroCopy(
  state: ReturnType<typeof useFinance>["state"],
  m: ReturnType<typeof computeMetrics>,
) {
  if (m.monthIncome === 0 && state.accounts.length === 0) {
    return {
      headline: "Let's set the foundation of your financial system.",
      body: "Add your first account and a few transactions to begin seeing your position take shape.",
    };
  }
  if (m.monthIncome - m.monthExpenses > 0) {
    return {
      headline: "Your finances are progressing steadily.",
      body: "Savings are growing and cash flow is healthy. You're on track for what matters next.",
    };
  }
  if (m.monthExpenses > m.monthIncome) {
    return {
      headline: "Spending is running ahead of income.",
      body: "Nothing alarming — a calm review of this month's categories will reveal where to gently steer.",
    };
  }
  return {
    headline: "Steady and balanced.",
    body: "A calm month is a good moment to plan the next intentional step.",
  };
}

/**
 * Outstanding debt lives with the financial metrics rather than in
 * Settings — it's a number people revisit, not a preference.
 */
function DebtCard({
  debt,
  currency,
  accounts,
  onSave,
  onRepay,
}: {
  debt: number;
  currency: string;
  accounts: Account[];
  onSave: (debt: number) => void;
  onRepay: (accountId: string, amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(debt || ""));
  const [repaying, setRepaying] = useState(false);
  const [repayAccountId, setRepayAccountId] = useState(accounts[0]?.id || "");
  const [repayAmount, setRepayAmount] = useState("");

  const submitRepay = () => {
    const amount = Number(repayAmount);
    if (!repayAccountId || !amount || amount <= 0) return;
    onRepay(repayAccountId, Math.min(amount, debt));
    setRepayAmount("");
    setRepaying(false);
  };

  if (editing) {
    return (
      <div className="rounded-2xl bg-surface-elevated p-4 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Outstanding debt
        </div>
        <Input
          className="mt-3"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Outstanding debt"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          For a starting balance or a correction. To pay it down with real money, use Repay instead
          — it updates an account too.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              onSave(Number(value) || 0);
              setEditing(false);
            }}
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setValue(String(debt || ""));
              setEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (repaying) {
    return (
      <div className="rounded-3xl bg-surface-elevated p-5 shadow-soft">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Repay debt</div>
        {accounts.length > 0 ? (
          <>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="debt-repay-account" className="text-xs">
                From account
              </Label>
              <Select value={repayAccountId} onValueChange={setRepayAccountId}>
                <SelectTrigger id="debt-repay-account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="debt-repay-amount" className="text-xs">
                Amount
              </Label>
              <Input
                id="debt-repay-amount"
                inputMode="numeric"
                autoFocus
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder={String(debt)}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Deducts from the account and reduces outstanding debt by the same amount.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Add an account on the Money tab first — repayment needs somewhere to draw from.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={submitRepay} disabled={accounts.length === 0}>
            Confirm repayment
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setRepayAmount("");
              setRepaying(false);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <KpiCard
      compact
      label="Outstanding Debt"
      accent="amber"
      value={<AnimatedMoney value={debt} currency={currency} />}
      action={
        <div className="flex items-center gap-3">
          {debt > 0 && (
            <button
              onClick={() => setRepaying(true)}
              className="text-xs font-medium text-amber hover:underline"
            >
              Repay
            </button>
          )}
          <button
            onClick={() => {
              setValue(String(debt || ""));
              setEditing(true);
            }}
            className="text-xs font-medium text-amber hover:underline"
          >
            Edit
          </button>
        </div>
      }
    />
  );
}

function GoalFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-accent/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num mt-0.5 text-sm font-semibold">{value}</div>
    </div>
  );
}
