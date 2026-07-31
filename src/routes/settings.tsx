import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/finance-cards";
import { useFinance } from "@/lib/finance-store";
import { useTheme, type Theme } from "@/lib/theme";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sun, Moon, Laptop, Download, Upload, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FinanceState } from "@/lib/finance-types";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FinanceOS" },
      { name: "description", content: "Appearance and data backup." },
    ],
  }),
  component: SettingsPage,
});

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
];

function isValidFinanceState(data: unknown): data is FinanceState {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.profile === "object" &&
    Array.isArray(d.accounts) &&
    Array.isArray(d.transactions) &&
    Array.isArray(d.goals) &&
    Array.isArray(d.reviews)
  );
}

function SettingsPage() {
  const { state, replaceState, resetFinancialData } = useFinance();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<FinanceState | null>(null);

  function handleExport() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `financeos-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!isValidFinanceState(parsed)) {
          toast.error("That file doesn't look like a FinanceOS backup");
          return;
        }
        setPendingImport(parsed);
      } catch {
        toast.error("Couldn't read that file — is it valid JSON?");
      }
    };
    reader.readAsText(file);
  }

  function confirmImport() {
    if (!pendingImport) return;
    replaceState(pendingImport);
    setPendingImport(null);
    toast.success("Backup restored");
  }

  return (
    <AppShell>
      <SectionHeader title="Settings" description="Appearance and your data." />

      <div className="space-y-6">
        {/* Account */}
        <AccountSection />

        {/* Appearance */}
        <section className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
          <h2 className="font-display text-base font-semibold">Appearance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how FinanceOS looks on this device.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {themeOptions.map((opt) => {
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm transition-colors ${
                    active
                      ? "border-ocean bg-ocean text-ocean-foreground"
                      : "border-border/60 bg-background text-foreground/80 hover:bg-accent"
                  }`}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Backup & Restore */}
        <section className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
          <h2 className="font-display text-base font-semibold">Backup &amp; restore</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your data lives only in this browser right now — nothing is synced to the cloud yet.
            Download a backup regularly, especially before clearing your browser data or switching
            devices.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Download backup (.json)
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Restore from backup
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>
        </section>


        <DangerZone onReset={resetFinancialData} />
      </div>

      <AlertDialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces everything currently in FinanceOS — accounts, transactions, goals, and
              reviews — with the contents of the file you selected. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Restore</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function AccountSection() {
  const { data: session } = useSession();
  const { syncStatus } = useFinance();

  if (!session) {
    return (
      <section className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
        <h2 className="font-display text-base font-semibold">Account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You're using FinanceOS without an account — your data stays only in this browser. Log in
          to sync it across every device.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ocean px-4 py-2 text-sm font-medium text-ocean-foreground hover:bg-ocean/90"
        >
          Log in or create an account
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-surface-elevated p-6 shadow-soft">
      <h2 className="font-display text-base font-semibold">Account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Logged in as <span className="font-medium text-foreground">{session.user.email}</span>. Your
        data syncs to the cloud —{" "}
        {syncStatus === "syncing"
          ? "syncing now"
          : syncStatus === "error"
            ? "sync error"
            : "up to date"}
        .
      </p>
      <Button variant="outline" className="mt-4" onClick={() => signOut()}>
        Log out
      </Button>
    </section>
  );
}

/**
 * Destructive actions, deliberately separated and visually distinct so
 * they can't be hit by accident while browsing settings.
 */
function DangerZone({ onReset }: { onReset: () => void }) {
  const [confirmText, setConfirmText] = useState("");

  return (
    <section className="rounded-2xl border border-coral/40 bg-coral/5 p-6">
      <h2 className="font-display text-base font-semibold text-coral">Danger zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Irreversible actions. Download a backup first if there's any chance you'll want this data
        back.
      </p>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-surface-elevated p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium">Reset all data</div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Permanently deletes every account, transaction, goal, allocation, budget, recurring
            rule, income record, review and inbox item — on this device and in the cloud. Your login
            stays intact.
          </p>
        </div>
        <AlertDialog onOpenChange={() => setConfirmText("")}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="shrink-0 gap-2">
              <Trash2 className="h-4 w-4" />
              Reset all data
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all financial data?</AlertDialogTitle>
              <AlertDialogDescription>
                This wipes everything FinanceOS knows about your money and returns the app to a
                first-time state, including onboarding. It cannot be undone. Your account and login
                are not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="reset-confirm">
                Type <span className="font-semibold">RESET</span> to confirm
              </Label>
              <Input
                id="reset-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="RESET"
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmText.trim().toUpperCase() !== "RESET"}
                onClick={() => {
                  onReset();
                  toast.success("All financial data has been reset");
                }}
              >
                Reset everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
