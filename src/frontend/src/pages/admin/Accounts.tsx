import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Download, Search, BarChart3, CreditCard, FileText, Loader2, Building2 } from "lucide-react";
import type { Customer, StatementEntry, Payment } from "../../backend.d";
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

function computeRunningBalance(entries: StatementEntry[]): { entry: StatementEntry; balance: number }[] {
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { entry, balance };
  });
}

// Customer Statement Tab
function CustomerStatementTab() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const [selectedStore, setSelectedStore] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [isLoadingStmt, setIsLoadingStmt] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["all-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const selectedCustomer = customers.find((c) => c.storeNumber === selectedStore);

  const handleQuick = (period: string) => {
    const { from, to } = getQuickRange(period);
    setFromDate(from.toISOString().split("T")[0]);
    setToDate(to.toISOString().split("T")[0]);
  };

  const handleLoad = async () => {
    if (!selectedStore || !actor) {
      toast.error("Please select a customer");
      return;
    }
    setIsLoadingStmt(true);
    try {
      const from = toNano(new Date(fromDate + "T00:00:00"));
      const to = toNano(new Date(toDate + "T23:59:59"));
      const data = await actor.getCustomerStatement(token, selectedStore, from, to);
      setEntries(data.sort((a, b) => Number(a.entryDate) - Number(b.entryDate)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load statement");
    } finally {
      setIsLoadingStmt(false);
    }
  };

  const withBalance = computeRunningBalance(entries);
  const closingBalance = withBalance[withBalance.length - 1]?.balance ?? 0;

  const handleDownloadPDF = () => {
    if (entries.length === 0) return;
    generateStatementPDF(
      entries,
      selectedCustomer?.name ?? selectedStore,
      selectedCustomer?.companyName ?? "",
      `${fromDate} to ${toDate}`,
      closingBalance,
      selectedStore
    );
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            Customer Statement
          </CardTitle>
          <CardDescription>Select a customer and date range to view their statement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Customer</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.storeNumber} value={c.storeNumber}>
                      {c.companyName} ({c.storeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLoad} disabled={isLoadingStmt || !selectedStore} className="gap-2 h-9">
              {isLoadingStmt ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Load Statement
            </Button>
            {entries.length > 0 && (
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 h-9">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base">{selectedCustomer?.companyName}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {fromDate} to {toDate} · {entries.length} entries
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className={`font-bold text-lg ${closingBalance > 0 ? "text-destructive" : "text-success"}`}>
                  ₹{closingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debit (₹)</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit (₹)</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {withBalance.map(({ entry, balance }) => (
                    <tr key={`${entry.referenceNumber}-${Number(entry.entryDate)}`} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-6 py-2 text-xs">{formatDate(entry.entryDate)}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs capitalize">{entry.entryType}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono">{entry.referenceNumber}</td>
                      <td className="px-4 py-2 text-right text-xs text-destructive font-medium">
                        {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-success font-medium">
                        {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                      </td>
                      <td className={`px-4 py-2 text-right text-xs font-semibold ${balance > 0 ? "text-destructive" : "text-success"}`}>
                        ₹{balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Company Statement Tab
function CompanyStatementTab() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [isLoadingStmt, setIsLoadingStmt] = useState(false);

  const handleQuick = (period: string) => {
    const { from, to } = getQuickRange(period);
    setFromDate(from.toISOString().split("T")[0]);
    setToDate(to.toISOString().split("T")[0]);
  };

  const handleLoad = async () => {
    if (!actor) return;
    setIsLoadingStmt(true);
    try {
      const from = toNano(new Date(fromDate + "T00:00:00"));
      const to = toNano(new Date(toDate + "T23:59:59"));
      const data = await actor.getCompanyStatement(token, from, to);
      setEntries(data.sort((a, b) => Number(a.entryDate) - Number(b.entryDate)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load statement");
    } finally {
      setIsLoadingStmt(false);
    }
  };

  const withBalance = computeRunningBalance(entries);
  const closingBalance = withBalance[withBalance.length - 1]?.balance ?? 0;

  const handleDownloadPDF = () => {
    if (entries.length === 0) return;
    generateStatementPDF(
      entries,
      "All Companies",
      "AONE VEGETABLES & SUPPLIER",
      `${fromDate} to ${toDate}`,
      closingBalance
    );
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Company Statement (All Customers)
          </CardTitle>
          <CardDescription>View the combined statement for all companies by date range</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-xs" />
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
          </div>
          <div className="flex gap-2">
            <Button onClick={handleLoad} disabled={isLoadingStmt} className="gap-2 h-9">
              {isLoadingStmt ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              Load Statement
            </Button>
            {entries.length > 0 && (
              <Button variant="outline" onClick={handleDownloadPDF} className="gap-2 h-9">
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {entries.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base">Company Statement</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {fromDate} to {toDate} · {entries.length} entries
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Balance</p>
                <p className={`font-bold text-lg ${closingBalance > 0 ? "text-destructive" : "text-success"}`}>
                  ₹{closingBalance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Debit (₹)</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`${entry.referenceNumber}-${Number(entry.entryDate)}-${entry.storeNumber}`} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="px-6 py-2 text-xs">{formatDate(entry.entryDate)}</td>
                      <td className="px-4 py-2 text-xs font-medium">{entry.companyName}</td>
                      <td className="px-4 py-2 text-xs font-mono">{entry.storeNumber}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs capitalize">{entry.entryType}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono">{entry.referenceNumber}</td>
                      <td className="px-4 py-2 text-right text-xs text-destructive font-medium">
                        {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-success font-medium">
                        {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Payment Feed Tab
function PaymentFeedTab() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();

  const [selectedStore, setSelectedStore] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [chequeDetails, setChequeDetails] = useState("");
  const [utrDetails, setUtrDetails] = useState("");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["all-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const { data: recentPayments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["all-payments", token],
    queryFn: () => actor!.getAllPayments(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const selectedCustomer = customers.find((c) => c.storeNumber === selectedStore);

  const addPaymentMutation = useMutation({
    mutationFn: () => {
      const amtNum = parseFloat(amount);
      if (isNaN(amtNum) || amtNum <= 0) throw new Error("Invalid amount");
      return actor!.addPayment(
        token,
        selectedStore,
        selectedCustomer?.companyName ?? "",
        amtNum,
        paymentMethod,
        paymentMethod === "cheque" ? chequeDetails : null,
        paymentMethod === "online" ? utrDetails : null
      );
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      setAmount("");
      setChequeDetails("");
      setUtrDetails("");
      qc.invalidateQueries({ queryKey: ["all-payments"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) {
      toast.error("Please select a customer");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (paymentMethod === "cheque" && !chequeDetails.trim()) {
      toast.error("Please enter cheque details");
      return;
    }
    if (paymentMethod === "online" && !utrDetails.trim()) {
      toast.error("Please enter UTR details");
      return;
    }
    addPaymentMutation.mutate();
  };

  const sortedPayments = [...recentPayments].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Add Payment Form */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Record Payment
          </CardTitle>
          <CardDescription>Feed a payment received from a customer</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.storeNumber} value={c.storeNumber}>
                      {c.companyName} ({c.storeNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount (₹)</Label>
              <Input
                id="pay-amount"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash on Delivery</SelectItem>
                  <SelectItem value="online">Online Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === "cheque" && (
              <div className="space-y-2">
                <Label htmlFor="cheque-details">Cheque Details</Label>
                <Textarea
                  id="cheque-details"
                  placeholder="Cheque number, bank name, date..."
                  value={chequeDetails}
                  onChange={(e) => setChequeDetails(e.target.value)}
                  className="min-h-20 text-sm"
                />
              </div>
            )}

            {paymentMethod === "online" && (
              <div className="space-y-2">
                <Label htmlFor="utr-details">UTR / Transaction ID</Label>
                <Input
                  id="utr-details"
                  placeholder="UTR number or transaction reference"
                  value={utrDetails}
                  onChange={(e) => setUtrDetails(e.target.value)}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              {addPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Recent Payments
            {!paymentsLoading && <Badge variant="secondary">{recentPayments.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paymentsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((k) => <Skeleton key={k} className="h-12 w-full" />)}
            </div>
          ) : sortedPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No payments recorded yet
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sortedPayments.map((payment) => (
                <div key={payment.paymentId} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm">{payment.companyName}</p>
                    <p className="font-bold text-success">₹{payment.amount.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs capitalize">{payment.paymentMethod}</Badge>
                    <span>{formatDate(payment.timestamp)}</span>
                    <span className="font-mono">{payment.storeNumber}</span>
                  </div>
                  {payment.chequeDetails && (
                    <p className="text-xs text-muted-foreground mt-1">Cheque: {payment.chequeDetails}</p>
                  )}
                  {payment.utrDetails && (
                    <p className="text-xs text-muted-foreground mt-1">UTR: {payment.utrDetails}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Main Accounts Page
export default function Accounts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Accounts</h1>
        <p className="text-muted-foreground text-sm mt-1">Customer statements, company statement, and payment management</p>
      </div>

      <Tabs defaultValue="customer-statement" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="customer-statement" className="gap-2 text-xs">
            <Search className="w-3.5 h-3.5" />
            Customer Statement
          </TabsTrigger>
          <TabsTrigger value="company-statement" className="gap-2 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            Company Statement
          </TabsTrigger>
          <TabsTrigger value="payment-feed" className="gap-2 text-xs">
            <CreditCard className="w-3.5 h-3.5" />
            Payment Feed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customer-statement">
          <CustomerStatementTab />
        </TabsContent>
        <TabsContent value="company-statement">
          <CompanyStatementTab />
        </TabsContent>
        <TabsContent value="payment-feed">
          <PaymentFeedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
