import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SectionHeader, SectionTitle } from "@/components/finance-cards";
import { useFinance } from "@/lib/finance-store";
import type { InboxItem, InboxItemType } from "@/lib/finance-types";
import { CaptureBar, inboxTypeMeta } from "@/components/CaptureBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Archive, Trash2, Inbox as InboxIcon, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Inbox | FinanceOS" },
      { name: "description", content: "Capture anything instantly, sort it out later." },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { state, addInboxItem, updateInboxItem, archiveInboxItem, removeInboxItem } = useFinance();
  const newItems = state.inbox.filter((i) => i.status === "new");
  const archivedItems = state.inbox.filter((i) => i.status === "archived");

  return (
    <AppShell>
      <SectionHeader title="Inbox" description="Capture it now, decide where it belongs later." />

      <CaptureBar onCapture={(content, type) => addInboxItem({ content, type })} />

      <div className="mt-8">
        <SectionTitle eyebrow={`${newItems.length} waiting`} title="To sort" />
        {newItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
            <InboxIcon className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing waiting — capture a thought above whenever one comes up.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {newItems.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                onRetype={(type) => updateInboxItem(item.id, { type })}
                onArchive={() => archiveInboxItem(item.id)}
                onRemove={() => removeInboxItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {archivedItems.length > 0 && (
        <div className="mt-10">
          <SectionTitle eyebrow={`${archivedItems.length} handled`} title="Archived" />
          <div className="space-y-2 opacity-70">
            {archivedItems.map((item) => (
              <InboxRow
                key={item.id}
                item={item}
                archived
                onRetype={(type) => updateInboxItem(item.id, { type })}
                onArchive={() => {}}
                onRemove={() => removeInboxItem(item.id)}
              />
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function InboxRow({
  item,
  archived,
  onRetype,
  onArchive,
  onRemove,
}: {
  item: InboxItem;
  archived?: boolean;
  onRetype: (type: InboxItemType) => void;
  onArchive: () => void;
  onRemove: () => void;
}) {
  const meta = inboxTypeMeta[item.type];
  const Icon = meta.icon;
  return (
    <div className="rounded-2xl bg-surface-elevated p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
          <Icon className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm">{item.content}</p>
          <div className="mt-1.5 text-xs text-muted-foreground">
            {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>
        {!archived && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onArchive}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              aria-label="Archive"
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              onClick={onRemove}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
        {archived && (
          <button
            onClick={onRemove}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      {!archived && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pl-11">
          <Select value={item.type} onValueChange={(v) => onRetype(v as InboxItemType)}>
            <SelectTrigger className="h-7 w-[170px] text-xs">
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
          {meta.hintTo && (
            <Link
              to={meta.hintTo}
              className="flex items-center gap-1 text-xs font-medium text-ocean hover:underline"
            >
              {meta.hint}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
