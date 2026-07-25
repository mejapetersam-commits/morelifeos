import type { FinanceState, Goal, Transaction } from "./finance-types";

export function greeting(now = new Date(), name?: string) {
  const h = now.getHours();
  const base = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${base}, ${name}` : base;
}

export function pct(now: number, prev: number) {
  if (prev === 0) return now === 0 ? 0 : 1;
  return (now - prev) / Math.abs(prev);
}

export function formatPct(v: number, digits = 1) {
  const s = v >= 0 ? "+" : "−";
  return `${s}${(Math.abs(v) * 100).toFixed(digits)}%`;
}

export function goalEta(g: Goal, monthlyContribution: number) {
  const remaining = Math.max(0, g.target - g.saved);
  if (remaining === 0) return { months: 0, date: new Date() };
  if (monthlyContribution <= 0) return { months: Infinity, date: null };
  const months = Math.ceil(remaining / monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return { months, date: d };
}

export function healthScore(m: FinanceMetrics, hasGoals: boolean) {
  let s = 40;
  if (m.savingsRate >= 0.2) s += 25;
  else if (m.savingsRate >= 0.1) s += 15;
  else if (m.savingsRate > 0) s += 8;
  if (m.availableCash > m.monthExpenses * 3) s += 20;
  else if (m.availableCash > m.monthExpenses) s += 10;
  if (m.monthIncome > m.monthExpenses) s += 10;
  if (hasGoals) s += 5;
  return Math.max(0, Math.min(100, s));
}


export function formatMoney(amount: number, currency = "KSh") {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  return `${sign}${currency} ${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function inMonth(iso: string, ref = new Date()) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function inPrevMonth(iso: string, ref = new Date()) {
  const d = new Date(iso);
  const p = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  return d.getFullYear() === p.getFullYear() && d.getMonth() === p.getMonth();
}

export interface FinanceMetrics {
  netWorth: number;
  availableCash: number;
  monthIncome: number;
  monthExpenses: number;
  savingsRate: number;
  prevIncome: number;
  prevExpenses: number;
  byCategory: Record<string, number>;
  prevByCategory: Record<string, number>;
}

export function computeMetrics(state: FinanceState): FinanceMetrics {
  const accounts = state.accounts;
  const availableCash = accounts
    .filter((a) => a.type !== "investment")
    .reduce((s, a) => s + a.balance, 0);
  const invest = accounts.filter((a) => a.type === "investment").reduce((s, a) => s + a.balance, 0);
  const netWorth = availableCash + invest + state.profile.investments - state.profile.debt;

  let monthIncome = 0;
  let monthExpenses = 0;
  let prevIncome = 0;
  let prevExpenses = 0;
  const byCategory: Record<string, number> = {};
  const prevByCategory: Record<string, number> = {};

  for (const t of state.transactions) {
    if (inMonth(t.date)) {
      if (t.type === "income") monthIncome += t.amount;
      else if (t.type === "expense") {
        monthExpenses += t.amount;
        byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
      }
    } else if (inPrevMonth(t.date)) {
      if (t.type === "income") prevIncome += t.amount;
      else if (t.type === "expense") {
        prevExpenses += t.amount;
        prevByCategory[t.category] = (prevByCategory[t.category] || 0) + t.amount;
      }
    }
  }

  const savingsRate = monthIncome > 0 ? (monthIncome - monthExpenses) / monthIncome : 0;

  return {
    netWorth,
    availableCash,
    monthIncome,
    monthExpenses,
    savingsRate,
    prevIncome,
    prevExpenses,
    byCategory,
    prevByCategory,
  };
}

export interface Insight {
  id: string;
  tone: "positive" | "neutral" | "attention";
  observation: string;
  explanation: string;
  options: string[];
}

export function generateInsights(state: FinanceState, m: FinanceMetrics): Insight[] {
  const out: Insight[] = [];
  const currency = state.profile.currency;

  if (m.monthIncome > 0) {
    if (m.savingsRate >= 0.2) {
      out.push({
        id: "sr-good",
        tone: "positive",
        observation: `Your savings rate is ${(m.savingsRate * 100).toFixed(0)}% this month.`,
        explanation: "You're keeping more than 20% of income — a strong foundation for long-term wealth.",
        options: ["Direct the surplus to a goal", "Increase an investment contribution", "Keep the current plan"],
      });
    } else if (m.savingsRate < 0.05) {
      out.push({
        id: "sr-low",
        tone: "attention",
        observation: `Your savings rate is ${(m.savingsRate * 100).toFixed(0)}% this month.`,
        explanation: "Little is being retained after expenses, which slows progress toward your goals.",
        options: ["Review top expense categories", "Extend a goal deadline", "Explore ways to increase income"],
      });
    }
  }

  // Category jumps vs last month
  for (const cat of Object.keys(m.byCategory)) {
    const now = m.byCategory[cat];
    const prev = m.prevByCategory[cat] || 0;
    if (prev > 0 && now > prev * 1.2) {
      const pct = Math.round(((now - prev) / prev) * 100);
      out.push({
        id: `cat-up-${cat}`,
        tone: "attention",
        observation: `${cat} spending is up ${pct}% vs last month.`,
        explanation: "A meaningful shift here reduces the capacity available for goals and savings.",
        options: [`Set a monthly ${cat.toLowerCase()} intention`, "Explore lower-cost alternatives", "Accept and adjust your plan"],
      });
    }
  }

  // Budget overruns — uses the budgets already set on the Money page
  for (const b of state.budgets) {
    const spent = m.byCategory[b.category] || 0;
    if (b.monthlyLimit <= 0) continue;
    if (spent > b.monthlyLimit) {
      out.push({
        id: `budget-over-${b.id}`,
        tone: "attention",
        observation: `You're ${formatMoney(spent - b.monthlyLimit, currency)} over your ${b.category} budget.`,
        explanation: `You've spent ${formatMoney(spent, currency)} of a ${formatMoney(b.monthlyLimit, currency)} monthly limit, with time still left in the month.`,
        options: [
          `Pause non-essential ${b.category.toLowerCase()} spending`,
          "Raise the budget if it's no longer realistic",
          "Accept and adjust next month",
        ],
      });
    } else if (spent >= b.monthlyLimit * 0.8) {
      out.push({
        id: `budget-near-${b.id}`,
        tone: "neutral",
        observation: `You're close to your ${b.category} budget — ${Math.round((spent / b.monthlyLimit) * 100)}% used.`,
        explanation: "Worth a glance before the month closes out.",
        options: [`Review recent ${b.category.toLowerCase()} transactions`, "Keep the current pace"],
      });
    }
  }

  if (m.monthIncome > m.prevIncome && m.prevIncome > 0) {
    out.push({
      id: "inc-up",
      tone: "positive",
      observation: "Income increased compared to last month.",
      explanation: "Additional income unlocks options — the choice of how to use it shapes long-term outcomes.",
      options: ["Assign it to a goal", "Increase investing", "Rebuild an emergency buffer"],
    });
  }

  if (state.goals.length === 0) {
    out.push({
      id: "no-goals",
      tone: "neutral",
      observation: "You haven't defined a financial goal yet.",
      explanation: "Goals give money direction. Even one clear goal changes how everyday choices feel.",
      options: ["Start with an emergency fund", "Define a medium-term goal", "Set a long-term investing target"],
    });
  }

  if (out.length === 0) {
    out.push({
      id: "quiet",
      tone: "neutral",
      observation: "Things look steady this month.",
      explanation: "No unusual movements. A calm month is a good time to plan the next intentional step.",
      options: ["Review your goals", "Reflect on the week", "Explore a new savings target"],
    });
  }

  return out;
}

export function monthlySeries(txs: Transaction[], months = 6) {
  const now = new Date();
  const out: { label: string; income: number; expenses: number; net: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let inc = 0;
    let exp = 0;
    for (const t of txs) {
      const td = new Date(t.date);
      if (td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()) {
        if (t.type === "income") inc += t.amount;
        else if (t.type === "expense") exp += t.amount;
      }
    }
    out.push({
      label: d.toLocaleString(undefined, { month: "short" }),
      income: inc,
      expenses: exp,
      net: inc - exp,
    });
  }
  return out;
}
