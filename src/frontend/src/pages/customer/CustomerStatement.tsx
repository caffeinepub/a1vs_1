import { useState } from "react";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, FileBarChart, Loader2, FileText } from "lucide-react";
import type { StatementEntry } from "../../backend.d";
import { generateStatementPDF } from "../../utils/pdfUtils";

function formatDate(timestamp: bigint | number): string {
  const ms = typeof timestamp === "bigint" ? Number(timestamp) / 1_000_000 : timestamp;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toNano(date: Date): bigint {
  return BigInt(date.getTime()) * 1_000_000n;
}

function getQuickRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date();
  if (period === "thisMonth") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "lastMonth") {
    from.setMonth(now.getMonth() - 1, 1);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    return { from, to };
  } else if (period === "last3months") {
    from.setMonth(now.getMonth() - 3, 1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "thisYear") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  } else if (period === "yearRange") {
    from.setFullYear(now.getFullYear() - 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to: now };
}

export default function CustomerStatement() {
  const { actor, isFetching } = useActor();

  const storeNumber = localStorage.getItem("a1vs_store_number") ?? "";
  const companyName = localStorage.getItem("a1vs_company_name") ?? "";
  const token = localStorage.getItem("a1vs_customer_token") ?? "";

  // Default to last 366 days
  const defaultFrom = new Date();
  defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
  const [fromDate, setFromDate] = useState(defaultFrom.toISOString().split("T")[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleQuick = (period: string) => {
    const { from, to } = getQuickRange(period);
    setFromDate(from.toISOString().split("T")[0]);
    setToDate(to.toISOString().split("T")[0]);
  };

  const handleLoad = async () => {
    if (!token) {
      toast.error("Session expired. Please log in again.");
      return;
    }
    if (!actor || isFetching) {
      toast.error("Connecting to backend, please try again in a moment.");
      return;
    }
    setIsLoading(true);
    try {
      const from = toNano(new Date(fromDate + "T00:00:00"));
      const to = toNano(new Date(toDate + "T23:59:59"));
      const data = await actor.getMyStatement(token, from, to);
      setEntries(data.sort((a, b) => Number(a.entryDate) - Number(b.entryDate)));
      if (data.length === 0) {
        toast.info("No entries found for the selected period.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load statement";
      toast.error(msg.includes("Access denied") || msg.includes("Unauthorized")
        ? "Access denied. Please log out and log in again."
        : msg
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Compute running balance
  let balance = 0;
  const withBalance = entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { entry, balance };
  });
  const closingBalance = withBalance[withBalance.length - 1]?.balance ?? 0;

  const handleDownloadPDF = () => {
    if (entries.length === 0) {
      toast.error("No entries to download. Load a statement first.");
      return;
    }
    generateStatementPDF(
      entries,
      companyName,
      companyName,
      `${fromDate} to ${toDate}`,
      closingBalance,
      storeNumber
    );
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileBarChart className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm">Account Statement</p>
            <p className="text-xs text-muted-foreground">{companyName} · Store #{storeNumber}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="shadow-xs bg-white border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-sm">Select Date Range</CardTitle>
          <CardDescription className="text-xs">
            View invoices, payments, and closing balance for the selected period (up to 366 days)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quick Range</Label>
            <Select onValueChange={handleQuick}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Quick select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
                <SelectItem value="last3months">Last 3 Months</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="yearRange">Last 366 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleLoad} disabled={isLoading || !actor} className="gap-2 flex-1 h-9">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {isLoading ? "Loading..." : "Load Statement"}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={entries.length === 0}
              className="gap-2 h-9"
            >
              <Download className="w-4 h-4" />
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statement results */}
      {entries.length > 0 && (
        <Card className="shadow-xs bg-white border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-sm">{companyName}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {fromDate} to {toDate} · {entries.length} entries
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className={`font-bold text-base ${closingBalance > 0 ? "text-destructive" : "text-success"}`}>
                  ₹{closingBalance.toFixed(2)}
                </p>
                {closingBalance > 0 && (
                  <p className="text-xs text-destructive">Amount Due</p>
                )}
                {closingBalance <= 0 && entries.length > 0 && (
                  <p className="text-xs text-success">No Balance Due</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Date</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Debit (₹)</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Credit (₹)</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {withBalance.map(({ entry, balance: rowBalance }) => (
                    <tr
                      key={`${entry.referenceNumber}-${Number(entry.entryDate)}`}
                      className="border-b border-border/50 hover:bg-muted/20"
                    >
                      <td className="px-6 py-2 text-xs whitespace-nowrap">{formatDate(entry.entryDate)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-xs capitalize">{entry.entryType}</Badge>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{entry.referenceNumber}</td>
                      <td className="px-3 py-2 text-right text-xs text-destructive font-medium whitespace-nowrap">
                        {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-success font-medium whitespace-nowrap">
                        {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                      </td>
                      <td className={`px-3 py-2 text-right text-xs font-semibold whitespace-nowrap ${rowBalance > 0 ? "text-destructive" : "text-success"}`}>
                        ₹{rowBalance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/20">
                    <td colSpan={3} className="px-6 py-3 text-xs font-bold uppercase">Closing Balance</td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-destructive">
                      {entries.reduce((sum, e) => sum + e.debit, 0) > 0 &&
                        `₹${entries.reduce((sum, e) => sum + e.debit, 0).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-bold text-success">
                      {entries.reduce((sum, e) => sum + e.credit, 0) > 0 &&
                        `₹${entries.reduce((sum, e) => sum + e.credit, 0).toFixed(2)}`}
                    </td>
                    <td className={`px-3 py-3 text-right text-sm font-bold ${closingBalance > 0 ? "text-destructive" : "text-success"}`}>
                      ₹{closingBalance.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl border border-border p-10 text-center shadow-xs">
          <FileBarChart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground text-sm">No statement loaded</p>
          <p className="text-xs text-muted-foreground mt-1">Select a date range and click "Load Statement"</p>
        </div>
      )}
    </div>
  );
}
