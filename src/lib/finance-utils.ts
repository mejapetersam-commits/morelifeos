import type {
  Account,
  CompoundingFrequency,
  FinanceState,
  Goal,
  InstitutionType,
  Transaction,
  TxType,
} from "./finance-types";

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

export function healthScore(m: FinanceMetrics, hasGoals: boolean): number | null {
  const hasAnyData = m.monthIncome > 0 || m.monthExpenses > 0 || m.availableCash > 0 || hasGoals;

  if (!hasAnyData) return null; // no data yet — let the UI show an empty state, not a score

  let s = 40;

  // Rewards
  if (m.savingsRate >= 0.2) s += 25;
  else if (m.savingsRate >= 0.1) s += 15;
  else if (m.savingsRate > 0) s += 8;

  if (m.availableCash > m.monthExpenses * 3) s += 20;
  else if (m.availableCash > m.monthExpenses) s += 10;

  if (m.monthIncome > m.monthExpenses) s += 10;
  if (hasGoals) s += 5;

  // Penalties
  if (m.savingsRate < 0) s -= 15; // spending into savings
  if (m.monthIncome < m.monthExpenses) s -= 10; // negative cash flow
  if (m.availableCash <= 0) s -= 15; // no buffer at all

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
  // profile.investments was a rough figure captured once at onboarding,
  // before the real Investment Accounts feature existed. Counting it here
  // as well as real investment account balances double-counts — anyone
  // who onboarded before that feature shipped would see a phantom number
  // in Net Worth with no account or transaction behind it, and no way to
  // edit or clear it. Real investment accounts (with a traceable opening
  // balance) are the source of truth now.
  const netWorth = availableCash + invest - state.profile.debt;

  let monthIncome = 0;
  let monthExpenses = 0;
  let prevIncome = 0;
  let prevExpenses = 0;
  const byCategory: Record<string, number> = {};
  const prevByCategory: Record<string, number> = {};

  for (const t of state.transactions) {
    // Opening-balance transactions represent money that existed before
    // tracking started, not real cash flow — including them here would
    // make account creation look like an income/expense event.
    if (t.isOpeningBalance) continue;
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
        explanation:
          "You're keeping more than 20% of income — a strong foundation for long-term wealth.",
        options: [
          "Direct the surplus to a goal",
          "Increase an investment contribution",
          "Keep the current plan",
        ],
      });
    } else if (m.savingsRate < 0.05) {
      out.push({
        id: "sr-low",
        tone: "attention",
        observation: `Your savings rate is ${(m.savingsRate * 100).toFixed(0)}% this month.`,
        explanation:
          "Little is being retained after expenses, which slows progress toward your goals.",
        options: [
          "Review top expense categories",
          "Extend a goal deadline",
          "Explore ways to increase income",
        ],
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
        explanation:
          "A meaningful shift here reduces the capacity available for goals and savings.",
        options: [
          `Set a monthly ${cat.toLowerCase()} intention`,
          "Explore lower-cost alternatives",
          "Accept and adjust your plan",
        ],
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
        options: [
          `Review recent ${b.category.toLowerCase()} transactions`,
          "Keep the current pace",
        ],
      });
    }
  }

  if (m.monthIncome > m.prevIncome && m.prevIncome > 0) {
    out.push({
      id: "inc-up",
      tone: "positive",
      observation: "Income increased compared to last month.",
      explanation:
        "Additional income unlocks options — the choice of how to use it shapes long-term outcomes.",
      options: ["Assign it to a goal", "Increase investing", "Rebuild an emergency buffer"],
    });
  }

  if (state.goals.length === 0) {
    out.push({
      id: "no-goals",
      tone: "neutral",
      observation: "You haven't defined a financial goal yet.",
      explanation:
        "Goals give money direction. Even one clear goal changes how everyday choices feel.",
      options: [
        "Start with an emergency fund",
        "Define a medium-term goal",
        "Set a long-term investing target",
      ],
    });
  }

  if (out.length === 0) {
    out.push({
      id: "quiet",
      tone: "neutral",
      observation: "Things look steady this month.",
      explanation:
        "No unusual movements. A calm month is a good time to plan the next intentional step.",
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
      if (t.isOpeningBalance) continue;
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

// ─── Investments & Savings ─────────────────────────────────────────────

const PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

/** Standard compound interest future value. rate is annual percent (e.g. 9.5, not 0.095). */
export function futureValue(
  principal: number,
  annualRatePct: number,
  years: number,
  compounding: CompoundingFrequency = "annually",
): number {
  const n = PERIODS_PER_YEAR[compounding];
  const r = annualRatePct / 100;
  if (r <= 0 || years <= 0) return principal;
  return principal * Math.pow(1 + r / n, n * years);
}

/**
 * Growth accrued since the account's rate was last confirmed (or since the
 * account existed, if never set), using its own expected annual return.
 * This is a projection, not a real transaction — the account's "Post
 * accrued growth" action turns it into one.
 */
export function accruedSinceUpdate(account: Account, now = new Date()): number {
  if (!account.expectedAnnualReturn || account.expectedAnnualReturn <= 0) return 0;
  const since = account.rateUpdatedAt ? new Date(account.rateUpdatedAt) : null;
  if (!since) return 0;
  const days = (now.getTime() - since.getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 0) return 0;
  const years = days / 365;
  return (
    futureValue(
      account.balance,
      account.expectedAnnualReturn,
      years,
      account.compoundingFrequency,
    ) - account.balance
  );
}

export interface InvestmentSummary {
  accounts: Account[];
  totalInvested: number;
  weightedAvgReturn: number; // percent
  projected: { years: number; value: number }[];
  byInstitutionType: { name: string; value: number }[];
}

const INSTITUTION_LABELS: Record<InstitutionType, string> = {
  bank: "Bank / Fixed Deposit",
  mmf: "Money Market Fund",
  sacco: "SACCO",
  broker: "Stocks / Broker",
  crypto: "Crypto",
  bond: "Government Bond / T-Bill",
  other: "Other",
};

export function institutionLabel(t?: InstitutionType) {
  return t ? INSTITUTION_LABELS[t] : "Other";
}

export function computeInvestmentSummary(state: FinanceState): InvestmentSummary {
  const accounts = state.accounts.filter((a) => a.type === "investment");
  const totalInvested = accounts.reduce((s, a) => s + a.balance, 0);
  const weightedAvgReturn =
    totalInvested > 0
      ? accounts.reduce((s, a) => s + a.balance * (a.expectedAnnualReturn || 0), 0) / totalInvested
      : 0;

  const horizons = [1, 5, 10];
  const projected = horizons.map((years) => ({
    years,
    value: accounts.reduce(
      (s, a) =>
        s + futureValue(a.balance, a.expectedAnnualReturn || 0, years, a.compoundingFrequency),
      0,
    ),
  }));

  const byType = new Map<string, number>();
  for (const a of accounts) {
    const label = institutionLabel(a.institutionType);
    byType.set(label, (byType.get(label) || 0) + a.balance);
  }
  const byInstitutionType = Array.from(byType.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return { accounts, totalInvested, weightedAvgReturn, projected, byInstitutionType };
}

// ─── Income Pipeline ───────────────────────────────────────────────────

export interface PipelineMetrics {
  expected: number;
  confirmed: number;
  collected: number;
  lost: number;
  conversionRate: number; // percent
}

export function computePipelineMetrics(state: FinanceState): PipelineMetrics {
  const opps = state.opportunities;
  const expected = opps
    .filter(
      (o) =>
        o.status === "idea" ||
        o.status === "quoted" ||
        o.status === "negotiating" ||
        o.status === "confirmed",
    )
    .reduce((s, o) => s + o.amount, 0);
  const confirmed = opps.filter((o) => o.status === "confirmed").reduce((s, o) => s + o.amount, 0);
  const collected = opps.filter((o) => o.status === "paid").reduce((s, o) => s + o.amount, 0);
  const lost = opps.filter((o) => o.status === "cancelled").reduce((s, o) => s + o.amount, 0);
  const paidCount = opps.filter((o) => o.status === "paid").length;
  const cancelledCount = opps.filter((o) => o.status === "cancelled").length;
  const closed = paidCount + cancelledCount;
  const conversionRate = closed > 0 ? (paidCount / closed) * 100 : 0;
  return { expected, confirmed, collected, lost, conversionRate };
}

// ─── Income Sources ────────────────────────────────────────────────────

function sumInRange(txs: Transaction[], sourceId: string, start: Date, end: Date) {
  return txs
    .filter(
      (t) =>
        t.type === "income" &&
        t.sourceId === sourceId &&
        new Date(t.date) >= start &&
        new Date(t.date) < end,
    )
    .reduce((s, t) => s + t.amount, 0);
}

export interface SourceAnalytics {
  source: FinanceState["incomeSources"][number];
  allTime: number;
  thisMonth: number;
  lastMonth: number;
  momGrowthPct: number | null;
  ytd: number;
  pctContributionThisMonth: number;
  isBestPerforming: boolean;
  isMostConsistent: boolean;
}

export function computeSourceAnalytics(state: FinanceState): SourceAnalytics[] {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
  const farPast = new Date(2000, 0, 1);

  const totalThisMonth = state.incomeSources.reduce(
    (s, src) => s + sumInRange(state.transactions, src.id, monthStart, nextMonthStart),
    0,
  );

  // Last 6 months, per source, for a consistency (coefficient of variation) check.
  const monthWindows: [Date, Date][] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    monthWindows.push([start, end]);
  }

  const base = state.incomeSources.map((source) => {
    const thisMonth = sumInRange(state.transactions, source.id, monthStart, nextMonthStart);
    const lastMonth = sumInRange(state.transactions, source.id, lastMonthStart, monthStart);
    const allTime = sumInRange(state.transactions, source.id, farPast, new Date(2100, 0, 1));
    const ytd = sumInRange(state.transactions, source.id, yearStart, yearEnd);
    const momGrowthPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
    const pctContributionThisMonth = totalThisMonth > 0 ? (thisMonth / totalThisMonth) * 100 : 0;
    const monthlyAmounts = monthWindows.map(([s, e]) =>
      sumInRange(state.transactions, source.id, s, e),
    );
    return {
      source,
      allTime,
      thisMonth,
      lastMonth,
      momGrowthPct,
      ytd,
      pctContributionThisMonth,
      monthlyAmounts,
    };
  });

  let bestId: string | null = null;
  let bestVal = -1;
  for (const b of base) {
    if (b.thisMonth > bestVal) {
      bestVal = b.thisMonth;
      bestId = b.source.id;
    }
  }

  let mostConsistentId: string | null = null;
  let lowestCv = Infinity;
  for (const b of base) {
    const nonZeroMonths = b.monthlyAmounts.filter((v) => v > 0);
    if (nonZeroMonths.length < 2) continue;
    const mean = nonZeroMonths.reduce((s, v) => s + v, 0) / nonZeroMonths.length;
    const variance = nonZeroMonths.reduce((s, v) => s + (v - mean) ** 2, 0) / nonZeroMonths.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : Infinity;
    if (cv < lowestCv) {
      lowestCv = cv;
      mostConsistentId = b.source.id;
    }
  }

  return base.map((b) => ({
    source: b.source,
    allTime: b.allTime,
    thisMonth: b.thisMonth,
    lastMonth: b.lastMonth,
    momGrowthPct: b.momGrowthPct,
    ytd: b.ytd,
    pctContributionThisMonth: b.pctContributionThisMonth,
    isBestPerforming: b.source.id === bestId && bestVal > 0,
    isMostConsistent: b.source.id === mostConsistentId,
  }));
}

// ─── Statement / M-Pesa import ─────────────────────────────────────────

export interface ParsedImportRow {
  tempId: string;
  date: string; // ISO
  type: TxType;
  amount: number;
  category: string;
  description: string;
  raw: string;
  confidence: "high" | "low";
}

function tempId() {
  return Math.random().toString(36).slice(2, 10);
}

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/naivas|carrefour|quickmart|tuskys|supermarket|chandarana|greenspoon/i, "Food"],
  [/uber|bolt|little cab|matatu|taxi|shuttle/i, "Transport"],
  [/kplc|nairobi water|dstv|gotv|zuku|jamii ?telkom|kenya power/i, "Housing"],
  [/safaricom|airtime|airtel ?ke/i, "Lifestyle"],
];

function guessCategory(name: string, fallback: string): string {
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(name)) return cat;
  }
  return fallback;
}

/** M-Pesa dates are DD/MM/YY (or YYYY). Returns an ISO string, midday to avoid timezone drift. */
function parseMpesaDate(dateStr: string, timeStr?: string): string {
  const [d, m, yRaw] = dateStr.split("/").map((s) => parseInt(s, 10));
  const y = yRaw < 100 ? 2000 + yRaw : yRaw;
  let hours = 12;
  let minutes = 0;
  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
    if (match) {
      hours = parseInt(match[1], 10) % 12;
      minutes = parseInt(match[2], 10);
      if (/PM/i.test(match[3])) hours += 12;
    }
  }
  return new Date(y, (m || 1) - 1, d || 1, hours, minutes).toISOString();
}

function parseAmount(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

/**
 * Native `new Date(string)` parsing is ambiguous for slash-separated dates
 * (it assumes US MM/DD/YYYY), which silently misreads the DD/MM/YYYY format
 * common in Kenyan bank and M-Pesa exports — "20/07/2026" would otherwise
 * parse as an invalid month and fall back to today's date. This checks
 * unambiguous formats explicitly before ever trusting native parsing.
 */
function parseFlexibleDate(raw: string): string {
  const trimmed = raw.trim();

  // ISO-ish: 2026-07-20 or 2026/07/20
  let m = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    const [, y, mo, d] = m;
    return new Date(Number(y), Number(mo) - 1, Number(d), 12).toISOString();
  }

  // Day-first: 20/07/2026, 20-07-26, etc.
  m = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (m) {
    const [, d, mo, yRaw] = m;
    const y = yRaw.length === 2 ? 2000 + Number(yRaw) : Number(yRaw);
    return new Date(y, Number(mo) - 1, Number(d), 12).toISOString();
  }

  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) return native.toISOString();
  return new Date().toISOString();
}

const DATE_TIME_RE = /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\s+at\s+(\d{1,2}:\d{2}\s?[AP]M))?/i;

/**
 * Parses one or more pasted M-Pesa SMS confirmations into candidate
 * transactions. Safaricom's exact wording varies by transaction type and
 * has changed over time, so this covers the common patterns (send, receive,
 * pay bill/till, withdraw, airtime, cash deposit) with a low-confidence
 * fallback for anything it doesn't recognize — everything here is meant to
 * be reviewed and edited before import, never trusted blindly.
 */
export function parseMpesaMessages(text: string): ParsedImportRow[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((c) => c.trim())
    .filter(Boolean);

  const chunks = paragraphs.flatMap((p) =>
    p
      .split(/(?=[A-Z0-9]{8,12}\s+Confirmed)/g)
      .map((c) => c.trim())
      .filter(Boolean),
  );

  const rows: ParsedImportRow[] = [];

  for (const msg of chunks) {
    const dateMatch = msg.match(DATE_TIME_RE);
    const date = dateMatch ? parseMpesaDate(dateMatch[1], dateMatch[2]) : new Date().toISOString();

    let m: RegExpMatchArray | null;

    if ((m = msg.match(/received\s+Ksh\s?([\d,]+\.\d{2})\s+cash deposit/i))) {
      rows.push({
        tempId: tempId(),
        date,
        type: "income",
        amount: parseAmount(m[1]),
        category: "Income",
        description: "M-Pesa cash deposit",
        raw: msg,
        confidence: "high",
      });
    } else if (
      (m = msg.match(
        /received\s+Ksh\s?([\d,]+\.\d{2})\s+from\s+([A-Z0-9'&. ]+?)\s+(?:\d{9,12})?\s*on/i,
      ))
    ) {
      const name = m[2].trim();
      rows.push({
        tempId: tempId(),
        date,
        type: "income",
        amount: parseAmount(m[1]),
        category: "Income",
        description: `From ${name}`,
        raw: msg,
        confidence: "high",
      });
    } else if (
      (m = msg.match(/Ksh\s?([\d,]+\.\d{2})\s+sent to\s+([A-Z0-9'&. ]+?)\s+(?:\d{9,12})?\s*on/i))
    ) {
      const name = m[2].trim();
      rows.push({
        tempId: tempId(),
        date,
        type: "expense",
        amount: parseAmount(m[1]),
        category: guessCategory(name, "Other"),
        description: `Sent to ${name}`,
        raw: msg,
        confidence: "high",
      });
    } else if (
      (m = msg.match(
        /Ksh\s?([\d,]+\.\d{2})\s+paid to\s+([A-Z0-9'&. ]+?)(?:\s+for account\s+\S+)?\s*on/i,
      ))
    ) {
      const name = m[2].trim();
      rows.push({
        tempId: tempId(),
        date,
        type: "expense",
        amount: parseAmount(m[1]),
        category: guessCategory(name, "Other"),
        description: `Paid ${name}`,
        raw: msg,
        confidence: "high",
      });
    } else if ((m = msg.match(/Ksh\s?([\d,]+\.\d{2})\s+withdrawn/i))) {
      rows.push({
        tempId: tempId(),
        date,
        type: "expense",
        amount: parseAmount(m[1]),
        category: "Cash withdrawal",
        description: "M-Pesa cash withdrawal",
        raw: msg,
        confidence: "high",
      });
    } else if ((m = msg.match(/Ksh\s?([\d,]+\.\d{2})\s+airtime purchased/i))) {
      rows.push({
        tempId: tempId(),
        date,
        type: "expense",
        amount: parseAmount(m[1]),
        category: "Lifestyle",
        description: "Airtime purchase",
        raw: msg,
        confidence: "high",
      });
    } else {
      // Fallback: grab any Ksh amount so the row still shows up for manual
      // fixing, rather than silently dropping a message we don't recognize.
      const anyAmount = msg.match(/Ksh\s?([\d,]+\.\d{2})/i);
      if (anyAmount) {
        rows.push({
          tempId: tempId(),
          date,
          type: "expense",
          amount: parseAmount(anyAmount[1]),
          category: "Other",
          description: msg.slice(0, 60),
          raw: msg,
          confidence: "low",
        });
      }
    }
  }

  return rows;
}

export interface CsvColumnMapping {
  date: number;
  description: number;
  amount: number;
  /** If set, amount's sign/column alone isn't enough — a separate "money out" column marks expenses. */
  amountOut?: number;
}

/**
 * Converts raw CSV rows (already split into cells, header excluded) into
 * candidate transactions using a user-confirmed column mapping — bank CSV
 * formats vary too much to guess reliably.
 */
export function parseCsvRows(rows: string[][], mapping: CsvColumnMapping): ParsedImportRow[] {
  const out: ParsedImportRow[] = [];
  for (const row of rows) {
    const rawDate = row[mapping.date]?.trim();
    const description = row[mapping.description]?.trim() || "Imported transaction";
    if (!rawDate) continue;

    let amount = 0;
    let type: TxType = "expense";
    if (mapping.amountOut !== undefined) {
      const inVal = parseFloat((row[mapping.amount] || "0").replace(/[^0-9.-]/g, "")) || 0;
      const outVal = parseFloat((row[mapping.amountOut] || "0").replace(/[^0-9.-]/g, "")) || 0;
      if (outVal > 0) {
        amount = outVal;
        type = "expense";
      } else {
        amount = inVal;
        type = "income";
      }
    } else {
      const raw = parseFloat((row[mapping.amount] || "0").replace(/[^0-9.-]/g, "")) || 0;
      type = raw < 0 ? "expense" : "income";
      amount = Math.abs(raw);
    }
    if (amount <= 0) continue;

    const date = parseFlexibleDate(rawDate);

    out.push({
      tempId: tempId(),
      date,
      type,
      amount,
      category: type === "income" ? "Income" : guessCategory(description, "Other"),
      description,
      raw: row.join(" | "),
      confidence: "high",
    });
  }
  return out;
}

// ─── Safe to spend ─────────────────────────────────────────────────────

export interface SafeToSpendResult {
  liquidBalance: number;
  upcomingBills: number;
  goalReserve: number;
  safeToSpend: number;
  windowDays: number;
}

function monthsUntil(deadline: string, now: Date): number {
  const d = new Date(deadline);
  const months = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
  return Math.max(1, months);
}

/**
 * What's actually free to spend right now, after money that's already
 * spoken for: bills due in the next `windowDays` (from active recurring
 * expenses) and the monthly contribution each goal needs to stay on track
 * for its deadline. This is deliberately conservative — it doesn't touch
 * investment-account balances (those aren't liquid for daily spending) and
 * doesn't try to net out budgets, since a budget is a spending ceiling, not
 * money that's already committed elsewhere.
 */
export function computeSafeToSpend(
  state: FinanceState,
  liquidBalance: number,
  windowDays = 30,
): SafeToSpendResult {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowDays * 24 * 60 * 60 * 1000);

  const upcomingBills = state.recurring
    .filter((r) => r.active && r.type === "expense")
    .filter((r) => {
      const due = new Date(r.nextDate);
      return due >= now && due <= windowEnd;
    })
    .reduce((s, r) => s + r.amount, 0);

  const goalReserve = state.goals.reduce((s, g) => {
    const remaining = Math.max(0, g.target - g.saved);
    if (remaining <= 0) return s;
    const months = monthsUntil(g.deadline, now);
    return s + remaining / months;
  }, 0);

  const safeToSpend = liquidBalance - upcomingBills - goalReserve;

  return { liquidBalance, upcomingBills, goalReserve, safeToSpend, windowDays };
}

// ─── Weekly review context ─────────────────────────────────────────────

export interface WeekSummary {
  income: number;
  expenses: number;
  net: number;
  topCategory: string | null;
  topCategoryAmount: number;
  txCount: number;
}

/** What actually happened in the 7 days starting at weekStart — the data context a review should be reflecting on, not a blank page. */
export function computeWeekSummary(state: FinanceState, weekStart: Date): WeekSummary {
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const txs = state.transactions.filter((t) => {
    if (t.isOpeningBalance) return false;
    const d = new Date(t.date);
    return d >= start && d < end;
  });

  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  const byCategory = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense") continue;
    byCategory.set(t.category, (byCategory.get(t.category) || 0) + t.amount);
  }
  let topCategory: string | null = null;
  let topCategoryAmount = 0;
  for (const [cat, amt] of byCategory) {
    if (amt > topCategoryAmount) {
      topCategory = cat;
      topCategoryAmount = amt;
    }
  }

  return {
    income,
    expenses,
    net: income - expenses,
    topCategory,
    topCategoryAmount,
    txCount: txs.length,
  };
}
