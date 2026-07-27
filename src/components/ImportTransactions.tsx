import { useState } from "react";
import Papa from "papaparse";
import { parseMpesaMessages, parseCsvRows, type ParsedImportRow } from "@/lib/finance-utils";
import type { Account, Transaction, TxType } from "@/lib/finance-types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadCloud, MessageSquareText, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

type Row = ParsedImportRow & { include: boolean };

export function ImportTransactions({
  accounts,
  onImport,
}: {
  accounts: Account[];
  onImport: (t: Omit<Transaction, "id">) => void;
}) {
  const [mode, setMode] = useState<"paste" | "csv">("paste");
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [rows, setRows] = useState<Row[]>([]);

  const updateRow = (tempId: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.tempId === tempId ? { ...r, ...patch } : r)));

  const commitImport = () => {
    const included = rows.filter((r) => r.include);
    if (included.length === 0 || !accountId) return;
    for (const r of included) {
      onImport({
        type: r.type,
        amount: r.amount,
        category: r.category,
        accountId,
        date: r.date,
        description: r.description,
      });
    }
    toast.success(`Imported ${included.length} transaction${included.length === 1 ? "" : "s"}`);
    setRows([]);
  };

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted-foreground">
        Add an account first — imported transactions need somewhere to post to.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border p-1">
          <button
            onClick={() => setMode("paste")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              mode === "paste" ? "bg-ocean text-ocean-foreground" : "text-muted-foreground"
            }`}
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            Paste M-Pesa messages
          </button>
          <button
            onClick={() => setMode("csv")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
              mode === "csv" ? "bg-ocean text-ocean-foreground" : "text-muted-foreground"
            }`}
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Upload CSV
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Import into</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-9 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {mode === "paste" ? (
        <PasteMode onParsed={(parsed) => setRows(parsed.map((r) => ({ ...r, include: true })))} />
      ) : (
        <CsvMode onParsed={(parsed) => setRows(parsed.map((r) => ({ ...r, include: true })))} />
      )}

      {rows.length > 0 && (
        <div className="rounded-2xl bg-surface-elevated shadow-soft">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="text-sm font-medium">
              {rows.filter((r) => r.include).length} of {rows.length} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: true })))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Select all
              </button>
              <button
                onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: false })))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Deselect all
              </button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {rows.map((r) => (
              <div
                key={r.tempId}
                className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-2.5 last:border-0"
              >
                <Checkbox
                  checked={r.include}
                  onCheckedChange={(c) => updateRow(r.tempId, { include: !!c })}
                />
                <Input
                  type="date"
                  value={r.date.slice(0, 10)}
                  onChange={(e) =>
                    updateRow(r.tempId, { date: new Date(e.target.value).toISOString() })
                  }
                  className="h-8 w-[130px] text-xs"
                />
                <Select
                  value={r.type}
                  onValueChange={(v) => updateRow(r.tempId, { type: v as TxType })}
                >
                  <SelectTrigger className="h-8 w-[90px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={r.category}
                  onChange={(e) => updateRow(r.tempId, { category: e.target.value })}
                  className="h-8 w-[110px] text-xs"
                />
                <Input
                  value={r.description}
                  onChange={(e) => updateRow(r.tempId, { description: e.target.value })}
                  className="h-8 flex-1 min-w-[140px] text-xs"
                />
                <Input
                  inputMode="numeric"
                  value={r.amount}
                  onChange={(e) => updateRow(r.tempId, { amount: Number(e.target.value) || 0 })}
                  className="h-8 w-[100px] text-xs num"
                />
                {r.confidence === "low" && (
                  <span title={r.raw} className="text-amber">
                    <TriangleAlert className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 p-4">
            <Button
              onClick={commitImport}
              disabled={rows.filter((r) => r.include).length === 0}
              className="w-full bg-ocean text-ocean-foreground hover:bg-ocean/90"
            >
              Import {rows.filter((r) => r.include).length} transaction
              {rows.filter((r) => r.include).length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PasteMode({ onParsed }: { onParsed: (rows: ParsedImportRow[]) => void }) {
  const [text, setText] = useState("");

  return (
    <div className="rounded-2xl bg-surface-elevated p-5 shadow-soft">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Paste one or more M-Pesa confirmation messages, e.g.\n\nQCI7X8Y9Z1 Confirmed. Ksh500.00 sent to JOHN DOE 0712345678 on 20/7/26 at 2:30 PM. New M-PESA balance is Ksh1,234.00.`}
        rows={6}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Safaricom's exact wording varies by transaction type — everything gets parsed into an
        editable preview below, so double-check before importing rather than trusting it blindly.
      </p>
      <Button
        onClick={() => {
          const parsed = parseMpesaMessages(text);
          if (parsed.length === 0) {
            toast.error("Couldn't find any transactions in that text");
            return;
          }
          onParsed(parsed);
        }}
        disabled={!text.trim()}
        className="mt-3 bg-ocean text-ocean-foreground hover:bg-ocean/90"
      >
        Parse messages
      </Button>
    </div>
  );
}

function CsvMode({ onParsed }: { onParsed: (rows: ParsedImportRow[]) => void }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [dateCol, setDateCol] = useState("0");
  const [descCol, setDescCol] = useState("1");
  const [amountCol, setAmountCol] = useState("2");
  const [separateOutCol, setSeparateOutCol] = useState(false);
  const [outCol, setOutCol] = useState("3");

  const onFile = (file: File) => {
    Papa.parse<string[]>(file, {
      complete: (result) => {
        const data = (result.data as string[][]).filter((r) => r.some((c) => c && c.trim()));
        if (data.length === 0) {
          toast.error("That file looks empty");
          return;
        }
        setHeaders(data[0]);
        setDataRows(data.slice(1));
      },
      error: () => toast.error("Couldn't read that CSV file"),
    });
  };

  return (
    <div className="rounded-2xl bg-surface-elevated p-5 shadow-soft">
      {headers.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground hover:bg-accent">
          <UploadCloud className="h-6 w-6" />
          Click to upload a bank statement CSV
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {dataRows.length} rows found. Tell us which column is which — bank CSV formats vary too
            much to guess reliably.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Date column</Label>
              <ColumnSelect headers={headers} value={dateCol} onChange={setDateCol} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description column</Label>
              <ColumnSelect headers={headers} value={descCol} onChange={setDescCol} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                {separateOutCol ? "Money in column" : "Amount column"}
              </Label>
              <ColumnSelect headers={headers} value={amountCol} onChange={setAmountCol} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={separateOutCol} onCheckedChange={(c) => setSeparateOutCol(!!c)} />
            My statement has separate "money in" and "money out" columns
          </label>
          {separateOutCol && (
            <div className="w-1/3 space-y-1">
              <Label className="text-xs">Money out column</Label>
              <ColumnSelect headers={headers} value={outCol} onChange={setOutCol} />
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setHeaders([]);
                setDataRows([]);
              }}
            >
              Start over
            </Button>
            <Button
              onClick={() => {
                const parsed = parseCsvRows(dataRows, {
                  date: Number(dateCol),
                  description: Number(descCol),
                  amount: Number(amountCol),
                  amountOut: separateOutCol ? Number(outCol) : undefined,
                });
                if (parsed.length === 0) {
                  toast.error("No valid rows found with that column mapping");
                  return;
                }
                onParsed(parsed);
              }}
              className="flex-1 bg-ocean text-ocean-foreground hover:bg-ocean/90"
            >
              Parse rows
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnSelect({
  headers,
  value,
  onChange,
}: {
  headers: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {headers.map((h, i) => (
          <SelectItem key={i} value={String(i)}>
            {h || `Column ${i + 1}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
