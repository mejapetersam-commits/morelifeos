export type AccountType = "bank" | "mobile" | "cash" | "investment";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
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

export interface FinanceState {
  profile: Profile;
  accounts: Account[];
  transactions: Transaction[];
  goals: Goal[];
  reviews: Review[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
}
