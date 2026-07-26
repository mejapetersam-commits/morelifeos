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
}
