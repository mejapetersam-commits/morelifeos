import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import {
  computeMetrics,
  formatMoney,
  formatPct,
  generateInsights,
  goalEta,
  greeting,
  healthScore,
  monthlySeries,
  pct,
} from "@/lib/finance-utils";
import {
  AnimatedMoney,
  KpiCard,
  ProgressRing,
  SectionTitle,
} from "@/components/finance-cards";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  ArrowUpRight,
  Plus,
  Wallet,
  Target,
  PiggyBank,
  Repeat,
  Sparkles,
  CalendarClock,
  Receipt,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  const { state } = useFinance();
  const m = computeMetrics(state);
  const insights = generateInsights(state, m);
  const series = monthlySeries(state.transactions, 6);
  const currency = state.profile.currency;

  const netWorth = m.netWorth;
  const monthlySurplus = m.monthIncome - m.monthExpenses;
  const surplusEstimate = monthlySurplus > 0 ? monthlySurplus : m.monthIncome * 0.1;

  // Sparklines
  const sparkNet = series.map((s) => s.net + m.netWorth * 0.9);
  const sparkCash = series.map((s) => Math.max(0, s.net) + m.availableCash * 0.85);
  const sparkIn = series.map((s) => s.income);
  const sparkOut = series.map((s) => s.expenses);

  const deltaIncome = pct(m.monthIncome, m.prevIncome);
  const deltaExpenses = pct(m.monthExpenses, m.prevExpenses);
  const deltaSavings = m.prevIncome > 0
    ? m.savingsRate - (m.prevIncome - m.prevExpenses) / m.prevIncome
    : 0;

  const health = healthScore(m, state.goals.length > 0);
  const healthLabel =
    health >= 80 ? "Excellent" : health >= 60 ? "Healthy" : health >= 40 ? "Building" : "Fragile";

  const now = new Date();
  const hero = heroCopy(state, m);

  // Recent activity
  const recent = state.transactions.slice(0, 5);

  // Upcoming bills — heuristic: last month expenses of Housing/Fixed-like categories
  const bills = deriveUpcomingBills(state);

  const topGoal = state.goals[0];
  const eta = topGoal ? goalEta(topGoal, surplusEstimate) : null;

  return (
    <>
      <OnboardingModal />
      <AppShell>
        {/* ─── Hero ────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-ocean via-ocean to-[oklch(0.28_0.06_255)] p-8 text-ocean-foreground shadow-hero md:p-12">
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
            <h1 className="mt-4 max-w-2xl font-display text-3xl font-semibold leading-[1.15] tracking-tight md:text-[42px]">
              {greeting()}
              {state.profile.vision.length > 0 ? "." : "."}
              <br />
              <span className="text-ocean-foreground/80">{hero.headline}</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ocean-foreground/70">
              {hero.body}
            </p>

            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4 md:max-w-3xl">
              <HeroStat label="Net Worth" value={<AnimatedMoney value={netWorth} currency={currency} />} />
              <HeroStat
                label="Available Cash"
                value={<AnimatedMoney value={m.availableCash} currency={currency} />}
              />
              <HeroStat
                label="Monthly Income"
                value={<AnimatedMoney value={m.monthIncome} currency={currency} />}
              />
              <HeroStat
                label="Savings Rate"
                value={
                  <span className="num">{Math.round(m.savingsRate * 100)}%</span>
                }
                sub={healthLabel}
              />
            </div>
          </div>
        </section>

        {/* ─── KPI Cards ───────────────────────────────────────── */}
        <section className="mt-10">
          <SectionTitle eyebrow="At a glance" title="Your financial position" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Net Worth"
              accent="ocean"
              value={<AnimatedMoney value={netWorth} currency={currency} />}
              delta={pct(netWorth, netWorth - monthlySurplus)}
              spark={sparkNet}
              meaning={
                monthlySurplus >= 0
                  ? "Growing steadily as savings and investments compound."
                  : "Slightly compressed this month — worth a look."
              }
            />
            <KpiCard
              label="Available Cash"
              accent="sage"
              value={<AnimatedMoney value={m.availableCash} currency={currency} />}
              spark={sparkCash}
              meaning={
                m.monthExpenses > 0
                  ? `About ${(m.availableCash / Math.max(1, m.monthExpenses)).toFixed(1)}× your monthly spending — your runway.`
                  : "Liquid funds ready across your active accounts."
              }
            />
            <KpiCard
              label="Monthly Income"
              accent="emerald"
              value={<AnimatedMoney value={m.monthIncome} currency={currency} />}
              delta={deltaIncome}
              spark={sparkIn}
              meaning={
                m.monthIncome > 0
                  ? "What's flowing in this month across all sources."
                  : "Log this month's income to see the full picture."
              }
            />
            <KpiCard
              label="Monthly Spending"
              accent="coral"
              value={<AnimatedMoney value={m.monthExpenses} currency={currency} />}
              delta={deltaExpenses}
              invert
              spark={sparkOut}
              meaning={
                m.monthExpenses > 0
                  ? "Everything leaving your accounts this month."
                  : "No expenses recorded yet this month."
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              label="Savings Rate"
              accent="gold"
              value={<span className="num">{Math.round(m.savingsRate * 100)}%</span>}
              delta={deltaSavings}
              meaning="Share of income you keep. Above 20% is a strong foundation."
            />
            <KpiCard
              label="Financial Health"
              accent="royal"
              value={
                <span>
                  <span className="num">{health}</span>
                  <span className="ml-1 text-base font-normal text-muted-foreground">/ 100</span>
                </span>
              }
              meaning={`${healthLabel} — a composite of runway, cash flow and savings discipline.`}
            />
            <KpiCard
              label="Investments"
              accent="indigo"
              value={
                <AnimatedMoney
                  value={
                    state.accounts.filter((a) => a.type === "investment").reduce((s, a) => s + a.balance, 0) +
                    state.profile.investments
                  }
                  currency={currency}
                />
              }
              meaning="Capital working for your future self."
            />
          </div>
        </section>

        {/* ─── Financial Intelligence ──────────────────────────── */}
        <section className="mt-12">
          <SectionTitle
            eyebrow="Financial Intelligence"
            title="What deserves your attention"
            action={
              <Link
                to="/ai"
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo hover:opacity-80"
              >
                Open Intelligence <ArrowUpRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="relative overflow-hidden rounded-3xl bg-surface-elevated p-8 shadow-lift">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo/10 blur-3xl" />
            <div className="relative grid gap-6 md:grid-cols-3">
              {insights.slice(0, 3).map((i, idx) => (
                <IntelligenceItem key={i.id} insight={i} index={idx} />
              ))}
            </div>
            <p className="relative mt-8 text-[12px] italic text-muted-foreground">
              FinanceOS observes and explains. You decide.
            </p>
          </div>
        </section>

        {/* ─── Cash Flow + Goal ────────────────────────────────── */}
        <section className="mt-12 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-3xl bg-surface-elevated p-7 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Cash Flow — six months
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="font-display text-3xl font-semibold num">
                    {formatMoney(monthlySurplus, currency)}
                  </span>
                  <span className="text-sm text-muted-foreground">net this month</span>
                </div>
              </div>
              <div className="hidden items-center gap-4 text-[11px] uppercase tracking-widest text-muted-foreground md:flex">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald" /> Income
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-coral" /> Expenses
                </span>
              </div>
            </div>
            <div className="mt-6 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--coral)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="var(--coral)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "var(--shadow-lift)",
                    }}
                    formatter={(v: number, k: string) => [formatMoney(v, currency), k]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="var(--emerald)"
                    strokeWidth={2}
                    fill="url(#inGrad)"
                    animationDuration={900}
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="var(--coral)"
                    strokeWidth={2}
                    fill="url(#outGrad)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-surface-elevated p-7 shadow-soft">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Goal Progress
              </div>
              <Link to="/goals" className="text-xs font-medium text-royal hover:opacity-80">
                All goals →
              </Link>
            </div>
            {topGoal ? (
              <div className="mt-6 flex flex-col items-center text-center">
                <ProgressRing
                  progress={topGoal.saved / Math.max(1, topGoal.target)}
                  accent="royal"
                  label={topGoal.name}
                />
                <div className="mt-5 font-display text-xl font-semibold">{topGoal.name}</div>
                <div className="mt-1 text-sm num text-muted-foreground">
                  {formatMoney(Math.max(0, topGoal.target - topGoal.saved), currency)} remaining
                </div>
                {eta && eta.date && (
                  <div className="mt-4 rounded-full bg-royal/8 px-3 py-1.5 text-[12px] font-medium text-royal">
                    Expected: {eta.date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                )}
                <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground">
                  At an estimated {formatMoney(surplusEstimate, currency)} / month, you're on a steady path.
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
        </section>

        {/* ─── Recent Activity + Upcoming Bills ────────────────── */}
        <section className="mt-12 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 rounded-3xl bg-surface-elevated p-7 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Recent Activity
                </div>
                <h3 className="mt-1 font-display text-xl font-semibold">Money in motion</h3>
              </div>
              <Link to="/money" className="text-xs font-medium text-ocean hover:opacity-80">
                View all →
              </Link>
            </div>
            <div className="mt-5">
              {recent.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No transactions yet."
                  body="Every entry builds a clearer picture of where money flows."
                  cta={{ to: "/money", label: "Log a transaction" }}
                />
              ) : (
                <ul className="divide-y divide-border/60">
                  {recent.map((t) => (
                    <TxRow key={t.id} tx={t} currency={currency} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 rounded-3xl bg-surface-elevated p-7 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Upcoming Bills
                </div>
                <h3 className="mt-1 font-display text-xl font-semibold">Coming up</h3>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {bills.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="Nothing pending."
                  body="Recurring expenses will appear here so you're never caught by surprise."
                />
              ) : (
                bills.map((b) => <BillRow key={b.id} bill={b} currency={currency} />)
              )}
            </div>
          </div>
        </section>

        {/* ─── Quick Actions ───────────────────────────────────── */}
        <section className="mt-12">
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

        {/* ─── Weekly Reflection ───────────────────────────────── */}
        <section className="mt-12">
          <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-surface p-8 shadow-soft md:p-10">
            <div className="pointer-events-none absolute right-6 top-6 hidden md:block">
              <ShieldCheck className="h-16 w-16 text-sage/30" />
            </div>
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Weekly Reflection
            </div>
            <h3 className="mt-2 max-w-xl font-display text-2xl font-semibold tracking-tight">
              A calm mind makes better financial decisions.
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Take a few quiet minutes to note what worked, what challenged you, and where you'll
              focus next week. Learning compounds like wealth.
            </p>
            <div className="mt-6">
              <Link
                to="/reviews"
                className="inline-flex items-center gap-2 rounded-full bg-ocean px-5 py-2.5 text-sm font-medium text-ocean-foreground shadow-soft transition-all hover:shadow-lift"
              >
                Start this week's review <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </AppShell>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components

function HeroStat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-ocean-foreground/50">
        {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-semibold tracking-tight md:text-[26px]">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-ocean-foreground/60">{sub}</div>}
    </div>
  );
}

function IntelligenceItem({
  insight,
  index,
}: {
  insight: ReturnType<typeof generateInsights>[number];
  index: number;
}) {
  const accent =
    insight.tone === "positive" ? "sage" : insight.tone === "attention" ? "amber" : "indigo";
  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full bg-${accent}`} />
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

function TxRow({ tx, currency }: { tx: ReturnType<typeof useFinance>["state"]["transactions"][number]; currency: string }) {
  const isIncome = tx.type === "income";
  const isTransfer = tx.type === "transfer";
  const color = isIncome ? "text-sage" : isTransfer ? "text-royal" : "text-foreground";
  const bg =
    isIncome ? "bg-sage/10 text-sage" :
    isTransfer ? "bg-royal/10 text-royal" :
    tx.type === "investment" ? "bg-indigo/10 text-indigo" :
    "bg-coral/10 text-coral";
  const sign = isIncome ? "+" : "−";
  const d = new Date(tx.date);
  const dayLabel = relativeDay(d);
  return (
    <li className="flex items-center gap-4 py-3.5">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium", bg)}>
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

function deriveUpcomingBills(state: ReturnType<typeof useFinance>["state"]): Bill[] {
  const map = new Map<string, { total: number; count: number; lastDate: Date }>();
  for (const t of state.transactions) {
    if (t.type !== "expense") continue;
    const key = (t.description?.trim() || t.category || "").toLowerCase();
    if (!key) continue;
    const d = new Date(t.date);
    const cur = map.get(key);
    if (cur) {
      cur.total += t.amount;
      cur.count += 1;
      if (d > cur.lastDate) cur.lastDate = d;
    } else {
      map.set(key, { total: t.amount, count: 1, lastDate: d });
    }
  }
  const recurring: Bill[] = [];
  for (const [name, v] of map) {
    if (v.count < 2) continue;
    const next = new Date(v.lastDate);
    next.setMonth(next.getMonth() + 1);
    const days = (next.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    recurring.push({
      id: name,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      amount: v.total / v.count,
      due: next,
      status: days < 0 ? "overdue" : days <= 5 ? "soon" : "upcoming",
    });
  }
  return recurring
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
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest", badge)}>
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

function heroCopy(state: ReturnType<typeof useFinance>["state"], m: ReturnType<typeof computeMetrics>) {
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
