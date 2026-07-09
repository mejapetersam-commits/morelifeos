import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { OnboardingModal } from "@/components/OnboardingModal";
import { useFinance } from "@/lib/finance-store";
import { computeMetrics, formatMoney, generateInsights, monthlySeries } from "@/lib/finance-utils";
import { InsightCard, StatCard } from "@/components/finance-cards";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinanceOS — Your Personal Financial Command Center" },
      {
        name: "description",
        content:
          "A personal financial operating system that helps you understand, decide, and build long-term wealth with clarity.",
      },
      { property: "og:title", content: "FinanceOS — Your Personal Financial Command Center" },
      {
        property: "og:description",
        content: "A personal financial operating system that helps you understand, decide, and build long-term wealth with clarity.",
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
  const now = new Date().toLocaleString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <OnboardingModal />
      <AppShell>
        <div className="mb-10">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{now}</div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
            Your financial position
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            A calm view of where you are, whether you're progressing, and what deserves your
            attention this week.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Net worth"
            value={formatMoney(m.netWorth, currency)}
            hint="Cash + investments − debt"
            accent="ocean"
          />
          <StatCard
            label="Available cash"
            value={formatMoney(m.availableCash, currency)}
            hint="Across your active accounts"
            accent="sage"
          />
          <StatCard
            label="Savings rate"
            value={`${Math.round(m.savingsRate * 100)}%`}
            hint={
              m.monthIncome > 0
                ? `${formatMoney(m.monthIncome - m.monthExpenses, currency)} kept this month`
                : "Log income to see progress"
            }
            accent="gold"
          />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Cash flow — last 6 months
            </div>
            <div className="mb-4 font-display text-lg font-semibold">
              {formatMoney(m.monthIncome - m.monthExpenses, currency)}{" "}
              <span className="text-sm font-normal text-muted-foreground">this month</span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--sage)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--sage)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatMoney(v, currency)}
                  />
                  <Area
                    type="monotone"
                    dataKey="net"
                    stroke="var(--sage)"
                    strokeWidth={2}
                    fill="url(#netGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
            <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Goal progress
            </div>
            {state.goals.length === 0 ? (
              <div className="flex h-40 flex-col items-start justify-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Goals give money direction. Even one clear goal changes how everyday choices feel.
                </p>
                <Link
                  to="/goals"
                  className="text-sm font-medium text-ocean underline-offset-4 hover:underline"
                >
                  Define your first goal →
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {state.goals.slice(0, 3).map((g) => {
                  const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
                  return (
                    <li key={g.id}>
                      <div className="flex items-baseline justify-between">
                        <div className="font-medium">{g.name}</div>
                        <div className="text-sm num text-muted-foreground">
                          {formatMoney(g.saved, currency)} / {formatMoney(g.target, currency)}
                        </div>
                      </div>
                      <Progress value={pct} className="mt-2 h-1.5" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl font-semibold">What to consider</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {insights.slice(0, 4).map((i) => (
              <InsightCard key={i.id} insight={i} />
            ))}
          </div>
        </div>
      </AppShell>
    </>
  );
}
