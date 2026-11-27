import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, Wallet, CalendarDays, Sprout, Settings,
  Sun, Moon, LogIn, Cloud, CloudOff, HardDrive, Loader2, Plus,
} from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "@/lib/theme";
import { useSession, signOut } from "@/lib/auth-client";
import { useFinance } from "@/lib/finance-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaptureBar } from "@/components/CaptureBar";

const nav = [
  { to: "/", label: "Today", icon: Home },
  { to: "/plan", label: "Plan", icon: CalendarDays },
  { to: "/money", label: "Money", icon: Wallet },
  { to: "/growth", label: "Growth", icon: Sprout },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function QuickThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex items-center gap-2 rounded-xl text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${compact ? "p-2" : "px-3 py-2"}`}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!compact && (isDark ? "Light appearance" : "Dark appearance")}
    </button>
  );
}

function AccountStatus() {
  const { data: session } = useSession();
  const { syncStatus } = useFinance();

  if (!session) {
    return (
      <Link to="/login" className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <LogIn className="h-4 w-4" /> Sign in to sync
      </Link>
    );
  }

  const syncIcon = syncStatus === "syncing"
    ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
    : syncStatus === "error"
      ? <CloudOff className="h-3.5 w-3.5 text-coral" />
      : syncStatus === "local"
      ? <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
      : <Cloud className="h-3.5 w-3.5 text-sage" />;

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold">{session.user.email}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {syncIcon}
          {syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync issue" : syncStatus === "local" ? "Saved locally" : "Data synced"}
        </div>
      </div>
      <button onClick={() => signOut()} className="shrink-0 text-[10px] font-medium text-muted-foreground hover:text-foreground">Log out</button>
    </div>
  );
}


function SlidingNav({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ x: 0, y: 0, width: 0, height: 0, ready: false });

  useLayoutEffect(() => {
    const root = navRef.current;
    if (!root) return;
    const update = () => {
      const active = root.querySelector<HTMLElement>('[data-nav-active="true"]');
      if (!active) return;
      const rootRect = root.getBoundingClientRect();
      const rect = active.getBoundingClientRect();
      setPill({
        x: rect.left - rootRect.left,
        y: rect.top - rootRect.top,
        width: rect.width,
        height: rect.height,
        ready: true,
      });
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(root);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [pathname, mobile]);

  return (
    <nav
      ref={navRef}
      aria-label={mobile ? "Main navigation" : "Workspace navigation"}
      className={mobile
        ? "relative mx-auto flex max-w-xl items-stretch justify-around gap-0 px-1 pt-1.5"
        : "relative flex flex-col gap-1"}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-0 rounded-xl bg-primary shadow-[0_8px_22px_rgba(4,78,59,0.24),inset_0_1px_0_rgba(255,255,255,0.22)] transition-[transform,width,height,opacity] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{
          width: pill.width,
          height: pill.height,
          transform: `translate3d(${pill.x}px,${pill.y}px,0)`,
          opacity: pill.ready ? 1 : 0,
        }}
      >
        <span className="absolute inset-x-3 top-0 h-px rounded-full bg-white/30" />
        <span className="absolute -right-4 -top-5 h-14 w-14 rounded-full bg-emerald-300/10 blur-xl" />
      </span>
      {nav.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            data-nav-active={active ? "true" : "false"}
            aria-current={active ? "page" : undefined}
            className={mobile
              ? `nav-3d relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-[9px] font-semibold transition-colors duration-300 ${active ? "text-white" : "text-muted-foreground"}`
              : `nav-3d group relative z-10 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-semibold transition-colors duration-300 ${active ? "text-white" : "text-foreground/65 hover:bg-accent hover:text-foreground"}`}
          >
            <span className={mobile
              ? "flex h-8 w-10 items-center justify-center rounded-xl"
              : "flex h-[17px] w-[17px] items-center justify-center"}
            >
              <Icon className={`${mobile ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]"} ${active ? "text-emerald-100" : "text-muted-foreground group-hover:text-foreground"}`} />
            </span>
            <span className={mobile ? "max-w-full truncate" : ""}>{item.label}</span>
            {!mobile && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-300" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="app-backdrop min-h-screen bg-background/70 text-foreground">
      <aside className="glass-panel fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-border/80 bg-surface/70 px-4 py-7 md:flex">
        <Link to="/" className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary font-display text-lg font-bold text-white shadow-soft">M</div>
          <div>
            <div className="font-display text-[15px] font-bold tracking-tight">MoreLifeOS</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Personal operating system</div>
          </div>
        </Link>

        <div className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/75">Workspace</div>
        <SlidingNav pathname={pathname} />

        <div className="mt-auto space-y-2 border-t border-border/80 pt-5">
          <AccountStatus />
          <QuickThemeToggle />
          <p className="px-3 pt-2 text-[10px] leading-relaxed text-muted-foreground">Build for decisions, not data.</p>
        </div>
      </aside>

      <main className="pb-28 md:pb-10 md:pl-[248px]">
        <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-5 sm:px-6 md:px-9 md:pt-9 xl:px-12">
          <div className="mb-6 flex items-center justify-between md:hidden">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#064E3B] font-display font-bold text-white">M</span>
              <span className="font-display text-sm font-bold tracking-tight">MoreLifeOS</span>
            </Link>
            <QuickThemeToggle compact />
          </div>
          {children}
        </div>
      </main>

      <div className="glass-panel fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-surface-elevated/80 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(4,60,38,0.12)] backdrop-blur-2xl md:hidden">
        <SlidingNav pathname={pathname} mobile />
      </div>

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
        className="fixed bottom-[94px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-sage text-white shadow-lift transition-all hover:-translate-y-0.5 hover:brightness-105 md:bottom-7 md:right-7 md:h-12 md:w-12"
      >
        <Plus className="h-5 w-5" />
      </button>
      <DialogContent>
        <DialogHeader><DialogTitle>Quick capture</DialogTitle></DialogHeader>
        <CaptureBar compact onCapture={(content, type) => addInboxItem({ content, type })} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
