import { useState } from "react";
import type { InboxItemType } from "@/lib/finance-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Wallet, Lightbulb, PiggyBank, Bell, Target, CheckSquare, StickyNote } from "lucide-react";

export const inboxTypeMeta: Record<
  InboxItemType,
  { label: string; icon: typeof Wallet; hintTo?: string; hint?: string }
> = {
  expense: { label: "Expense", icon: Wallet, hintTo: "/money", hint: "Log it in Money" },
  idea: {
    label: "Business idea",
    icon: Lightbulb,
    hintTo: "/income",
    hint: "Turn into an opportunity",
  },
  investment: {
    label: "Investment opportunity",
    icon: PiggyBank,
    hintTo: "/investments",
    hint: "Add in Investments",
  },
  reminder: { label: "Reminder", icon: Bell },
  goal: { label: "Goal", icon: Target, hintTo: "/goals", hint: "Set it up in Goals" },
  task: { label: "Task", icon: CheckSquare },
  note: { label: "Note", icon: StickyNote },
};

export function CaptureBar({
  onCapture,
  compact,
  onDone,
}: {
  onCapture: (content: string, type: InboxItemType) => void;
  compact?: boolean;
  onDone?: () => void;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<InboxItemType>("note");

  const submit = () => {
    if (!content.trim()) return;
    onCapture(content.trim(), type);
    setContent("");
    setType("note");
    onDone?.();
  };

  return (
    <div className={compact ? "" : "rounded-2xl bg-surface-elevated p-5 shadow-soft"}>
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Type anything — an expense, an idea, a reminder…"
        rows={compact ? 3 : 2}
        autoFocus={compact}
      />
      <div className="mt-3 flex items-center gap-2">
        <Select value={type} onValueChange={(v) => setType(v as InboxItemType)}>
          <SelectTrigger className="h-9 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(inboxTypeMeta) as InboxItemType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {inboxTypeMeta[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={submit}
          disabled={!content.trim()}
          className="ml-auto bg-ocean text-ocean-foreground hover:bg-ocean/90"
        >
          Capture
        </Button>
      </div>
    </div>
  );
}
