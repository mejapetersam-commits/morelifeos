import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Wallet,
  Target,
  NotebookPen,
  Sparkles,
  CheckCircle2,
  Circle,
  Settings,
  Sun,
  Moon,
  LogIn,
  Cloud,
  CloudOff,
  Loader2,
  PiggyBank,
  Briefcase,
  Inbox as InboxIcon,
  Plus,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useFinance } from "@/lib/finance-store";
import { computeMetrics } from "@/lib/finance-utils";
import { useTheme } from "@/lib/theme";
import { useSession, signOut } from "@/lib/auth-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaptureBar } from "@/components/CaptureBar";

const nav = [
  { to: "/", label: "Overview", icon: Home },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/investments", label: "Investments", icon: PiggyBank },
  { to: "/income", label: "Income", icon: Briefcase },
  { to: "/inbox", label: "Inbox", icon: InboxIcon },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reviews", label: "Reviews", icon: NotebookPen },
  { to: "/ai", label: "Intelligence", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function QuickThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-foreground/65 transition-colors hover:bg-accent hover:text-foreground"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

function AccountStatus() {
  const { data: session } = useSession();
  const { syncStatus } = useFinance();

  if (!session) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-foreground/65 transition-colors hover:bg-accent hover:text-foreground"
      >
        <LogIn className="h-4 w-4" />
        Log in to sync
      </Link>
    );
  }

  const syncIcon =
    syncStatus === "syncing" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    ) : syncStatus === "error" ? (
      <CloudOff className="h-3.5 w-3.5 text-coral" />
    ) : (
      <Cloud className="h-3.5 w-3.5 text-sage" />
    );

  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium">{session.user.email}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {syncIcon}
          {syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync error" : "Synced"}
        </div>
      </div>
      <button
        onClick={() => signOut()}
        className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        Log out
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { state } = useFinance();
  const m = computeMetrics(state);

  const focus = [
    {
      done: state.reviews.some((r) => {
        const d = new Date(r.createdAt);
        const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
        return diff < 7;
      }),
      text: "Review this week",
    },
    {
      done: state.goals.length > 0,
      text: state.goals.length > 0 ? "Goal defined" : "Define a goal",
    },
    {
      done: m.monthIncome > m.monthExpenses && m.monthIncome > 0,
      text: m.monthIncome > 0 ? "Positive cash flow" : "Log this month's income",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border/60 bg-surface px-4 py-7 md:flex">
        <Link to="/" className="mb-10 flex items-center gap-3 px-2">
          <div className="h-9 w-9 rounded-xl bg-ocean flex items-center justify-center text-ocean-foreground font-display font-semibold shadow-soft">
            L
          </div>
          <div>
            <div className="font-display text-[15px] font-semibold leading-tight">More LifeOS</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              FinanceOS
            </div>
          </div>
        </Link>

        <nav className="flex flex-col gap-0.5">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-ocean text-ocean-foreground shadow-soft"
                    : "text-foreground/65 hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon
                  className={`h-[17px] w-[17px] ${active ? "" : "text-foreground/50 group-hover:text-foreground"}`}
                />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 rounded-2xl border border-border/60 bg-surface-elevated p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Today's Focus
            </div>
          </div>
          <ul className="space-y-2.5">
            {focus.map((f, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-snug">
                {f.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60" />
                )}
                <span
                  className={f.done ? "text-muted-foreground line-through" : "text-foreground/80"}
                >
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto flex flex-col gap-1 px-2 pt-6">
          <AccountStatus />
          <QuickThemeToggle />
          <div className="px-1 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            Build for decisions, not data.
          </div>
        </div>
      </aside>

      <main className="md:pl-64 pb-24 md:pb-10">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-surface-elevated/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch overflow-x-auto px-1 [&::-webkit-scrollbar]:hidden">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex min-w-[64px] flex-1 flex-col items-center gap-1 whitespace-nowrap px-1 py-3 text-[10px] ${
                  active ? "text-ocean" : "text-muted-foreground"
                }`}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <QuickCaptureButton />
    </div>
  );
}

function QuickCaptureButton() {
  const { addInboxItem } = useFinance();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        onClick={() => setOpen(true)}
        aria-label="Quick capture"
        className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ocean text-ocean-foreground shadow-lift transition-transform hover:scale-105 md:bottom-8 md:right-8"
      >
        <Plus className="h-6 w-6" />
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quick capture</DialogTitle>
        </DialogHeader>
        <CaptureBar
          compact
          onCapture={(content, type) => addInboxItem({ content, type })}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
