export type AccountType = "bank" | "mobile" | "cash" | "investment";

export type InstitutionType = "bank" | "mmf" | "sacco" | "broker" | "crypto" | "bond" | "other";
export type CompoundingFrequency = "monthly" | "quarterly" | "annually";
export type RiskLevel = "low" | "medium" | "high";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  // The following only apply to type === "investment" accounts.
  institution?: string;
  institutionType?: InstitutionType;
  expectedAnnualReturn?: number; // percent, e.g. 9.5
  compoundingFrequency?: CompoundingFrequency;
  riskLevel?: RiskLevel;
  rateUpdatedAt?: string; // ISO date — when expectedAnnualReturn was last confirmed
  maturityDate?: string; // ISO date — for bonds/fixed-term deposits
}

export type TxType = "income" | "expense" | "transfer" | "investment";

export type Category =
  | "Food"
  | "Transport"
  | "Housing"
  | "Lifestyle"
  | "Business"
  | "Investment"
  | "Savings"
  | "Income"
  | "Other";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: Category | string;
  accountId: string;
  toAccountId?: string;
  date: string; // ISO
  description?: string;
  /** For income transactions only — which income source this came from. */
  sourceId?: string;
  /**
   * True for the transaction representing an account's starting balance.
   * Excluded from income/spending analytics (it's not real cash flow —
   * just money that existed before tracking started) but still shown and
   * editable in transaction history like anything else.
   */
  isOpeningBalance?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string; // ISO date
  createdAt: string;
}

export interface Review {
  id: string;
  weekOf: string; // ISO date (Monday)
  wentWell: string;
  challenged: string;
  learned: string;
  focus: string;
  createdAt: string;
}

export type DecisionOutcome = "good" | "mixed" | "bad";

export interface Decision {
  id: string;
  reviewId?: string;
  description: string;
  amount?: number;
  expectedOutcome?: string;
  date: string; // ISO — when the decision was made
  followUpDate: string; // ISO — when to ask "was this the right call"
  outcome?: DecisionOutcome;
  outcomeNote?: string;
  outcomeRecordedAt?: string;
  createdAt: string;
}

export interface Profile {
  currency: string;
  monthlyIncome: number;
  fixedExpenses: number;
  variableExpenses: number;
  savings: number;
  investments: number;
  debt: number;
  vision: string[]; // selected focus areas
  onboarded: boolean;
}

export interface Budget {
  id: string;
  category: Category | string;
  monthlyLimit: number;
}

export type RecurrenceFrequency = "weekly" | "monthly";

export interface RecurringTransaction {
  id: string;
  type: TxType;
  amount: number;
  category: Category | string;
  accountId: string;
  toAccountId?: string;
  description?: string;
  frequency: RecurrenceFrequency;
  /** Day of month (1-31) for "monthly", day of week (0=Sun..6=Sat) for "weekly" */
  anchor: number;
  nextDate: string; // ISO date of the next occurrence to post
  active: boolean;
  createdAt: string;
}

export type OpportunityStatus =
  "idea" | "quoted" | "negotiating" | "confirmed" | "paid" | "cancelled";

export interface IncomeOpportunity {
  id: string;
  client: string;
  amount: number;
  expectedDate: string; // ISO date
  status: OpportunityStatus;
  probability: number; // 0-100
  notes?: string;
  createdAt: string;
  paidDate?: string;
}

export type IncomeSourceStatus = "active" | "seasonal" | "paused";

export interface IncomeSource {
  id: string;
  name: string;
  category: string;
  status: IncomeSourceStatus;
  monthlyTarget?: number;
  annualTarget?: number;
  createdAt: string;
}

export type InboxItemType =
  "expense" | "idea" | "investment" | "reminder" | "goal" | "task" | "note";

export type InboxItemStatus = "new" | "archived";

export interface InboxItem {
  id: string;
  content: string;
  type: InboxItemType;
  status: InboxItemStatus;
  createdAt: string;
  archivedAt?: string;
}

export interface FinanceState {
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  reviews: Review[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  opportunities: IncomeOpportunity[];
  incomeSources: IncomeSource[];
  inbox: InboxItem[];
  decisions: Decision[];
}
