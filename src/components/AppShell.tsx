import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Wallet, Target, NotebookPen, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reviews", label: "Reviews", icon: NotebookPen },
  { to: "/ai", label: "AI", icon: Sparkles },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden h-screen w-60 flex-col border-r border-border/60 bg-surface px-5 py-8 md:flex">
        <Link to="/" className="mb-10 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-ocean flex items-center justify-center text-ocean-foreground font-display font-semibold">
            L
          </div>
          <div>
            <div className="font-display text-sm font-semibold leading-tight">More LifeOS</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">FinanceOS</div>
          </div>
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-ocean text-ocean-foreground"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto text-[11px] leading-relaxed text-muted-foreground">
          Build for decisions, not data.
        </div>
      </aside>

      <main className="md:pl-60 pb-24 md:pb-10">
        <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-surface-elevated/95 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch justify-between px-2">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[11px] ${
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
    </div>
  );
}
