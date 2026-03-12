import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CreditCard,
  Download,
  Edit2,
  FileText,
  ImagePlus,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { CompanyProfile, Customer, Payment } from "../../backend.d";
import { useExtendedActor } from "../../hooks/useExtendedActor";
import type { StatementEntry } from "../../types/appTypes";
import { generateStatementPDF } from "../../utils/pdfUtils";

function formatDate(timestamp: bigint | number): string {
  const ms =
    typeof timestamp === "bigint" ? Number(timestamp) / 1_000_000 : timestamp;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

function computeRunningBalance(
  entries: StatementEntry[],
): { entry: StatementEntry; balance: number }[] {
  let balance = 0;
  return entries.map((entry) => {
    balance += entry.debit - entry.credit;
    return { entry, balance };
  });
}

// Customer Statement Tab
function CustomerStatementTab() {
  const { actor, isFetching } = useExtendedActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const [selectedStore, setSelectedStore] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [isLoadingStmt, setIsLoadingStmt] = useState(false);

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["all-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const { data: companyProfile } = useQuery<CompanyProfile>({
    queryKey: ["company-profile"],
    queryFn: () => actor!.getCompanyProfile(),
    enabled: !!actor && !isFetching,
  });

  const selectedCustomer = customers.find(
    (c) => c.storeNumber === selectedStore,
  );

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
      let data: StatementEntry[] = [];
      const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
      const toMs = new Date(`${toDate}T23:59:59`).getTime();

      const [orders, payments] = await Promise.all([
        actor.getOrdersByStore(token, selectedStore).catch(() => []),
        actor.getPaymentsByStore(token, selectedStore).catch(() => []),
      ]);

      const orderEntries: StatementEntry[] = orders
        .filter((o) => {
          const ts = Number(o.timestamp) / 1_000_000;
          return (
            ts >= fromMs &&
            ts <= toMs &&
            o.status === "delivered" &&
            o.totalAmount > 0
          );
        })
        .map((o) => ({
          entryDate: o.timestamp,
          entryType: "invoice",
          referenceNumber: o.invoiceNumber
            ? `INV#${o.invoiceNumber}`
            : `INV#${o.poNumber ?? o.orderId}`,
          description: o.invoiceNumber
            ? `Invoice #${o.invoiceNumber}`
            : `INV #${o.poNumber ?? o.orderId}`,
          debit: o.totalAmount,
          credit: 0,
          storeNumber: o.storeNumber,
          companyName: o.companyName,
        }));

      const paymentEntries: StatementEntry[] = payments
        .filter((p) => {
          const tsMs = Number(p.timestamp) / 1_000_000;
          return tsMs >= fromMs && tsMs <= toMs && !p.deleted;
        })
        .map((p) => ({
          entryDate: p.timestamp,
          entryType: "payment",
          referenceNumber: p.paymentId,
          description: `Payment – ${p.paymentMethod}`,
          debit: 0,
          credit: p.amount,
          storeNumber: p.storeNumber,
          companyName: p.companyName,
        }));

      data = [...orderEntries, ...paymentEntries];
      setEntries(
        data.sort((a, b) => Number(a.entryDate) - Number(b.entryDate)),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load statement",
      );
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
      selectedStore,
      companyProfile ?? undefined,
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
          <CardDescription>
            Select a customer and date range to view their statement
          </CardDescription>
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
            <Button
              onClick={handleLoad}
              disabled={isLoadingStmt || !selectedStore}
              className="gap-2 h-9"
            >
              {isLoadingStmt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Load Statement
            </Button>
            {entries.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="gap-2 h-9"
              >
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
                <CardTitle className="font-heading text-base">
                  {selectedCustomer?.companyName}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {fromDate} to {toDate} · {entries.length} entries
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p
                  className={`font-bold text-lg ${closingBalance > 0 ? "text-destructive" : "text-success"}`}
                >
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
                    <th className="text-left px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Debit (₹)
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Credit (₹)
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Balance (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {withBalance.map(({ entry, balance }) => (
                    <tr
                      key={`${entry.referenceNumber}-${Number(entry.entryDate)}`}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="px-6 py-2 text-xs">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.entryType}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono">
                        {entry.referenceNumber}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-destructive font-medium">
                        {entry.debit > 0 ? `₹${entry.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-4 py-2 text-right text-xs text-success font-medium">
                        {entry.credit > 0 ? `₹${entry.credit.toFixed(2)}` : "-"}
                      </td>
                      <td
                        className={`px-4 py-2 text-right text-xs font-semibold ${balance > 0 ? "text-destructive" : "text-success"}`}
                      >
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
  const { actor, isFetching } = useExtendedActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [isLoadingStmt, setIsLoadingStmt] = useState(false);

  const { data: companyProfile } = useQuery<CompanyProfile>({
    queryKey: ["company-profile"],
    queryFn: () => actor!.getCompanyProfile(),
    enabled: !!actor && !isFetching,
  });

  const handleQuick = (period: string) => {
    const { from, to } = getQuickRange(period);
    setFromDate(from.toISOString().split("T")[0]);
    setToDate(to.toISOString().split("T")[0]);
  };

  const handleLoad = async () => {
    if (!actor) return;
    setIsLoadingStmt(true);
    try {
      let data: StatementEntry[] = [];
      const fromMs = new Date(`${fromDate}T00:00:00`).getTime();
      const toMs = new Date(`${toDate}T23:59:59`).getTime();

      const [orders, payments] = await Promise.all([
        actor.getAllOrders(token).catch(() => []),
        actor.getAllPayments(token).catch(() => []),
      ]);

      const orderEntries: StatementEntry[] = orders
        .filter((o) => {
          const ts = Number(o.timestamp) / 1_000_000;
          return (
            ts >= fromMs &&
            ts <= toMs &&
            o.status === "delivered" &&
            o.totalAmount > 0
          );
        })
        .map((o) => ({
          entryDate: o.timestamp,
          entryType: "invoice",
          referenceNumber: o.invoiceNumber
            ? `INV#${o.invoiceNumber}`
            : `INV#${o.poNumber ?? o.orderId}`,
          description: o.invoiceNumber
            ? `Invoice #${o.invoiceNumber} – ${o.companyName}`
            : `INV #${o.poNumber ?? o.orderId} – ${o.companyName}`,
          debit: o.totalAmount,
          credit: 0,
          storeNumber: o.storeNumber,
          companyName: o.companyName,
        }));

      const paymentEntries: StatementEntry[] = payments
        .filter((p) => {
          const tsMs = Number(p.timestamp) / 1_000_000;
          return tsMs >= fromMs && tsMs <= toMs && !p.deleted;
        })
        .map((p) => ({
          entryDate: p.timestamp,
          entryType: "payment",
          referenceNumber:
            p.paymentMethod === "online"
              ? (p.utrDetails ?? "Online")
              : p.paymentMethod === "cheque"
                ? (p.chequeDetails ?? "Cheque")
                : "Cash",
          description: `Payment – ${p.companyName}`,
          debit: 0,
          credit: p.amount,
          storeNumber: p.storeNumber,
          companyName: p.companyName,
        }));

      data = [...orderEntries, ...paymentEntries];
      setEntries(
        data.sort((a, b) => Number(a.entryDate) - Number(b.entryDate)),
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load statement",
      );
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
      closingBalance,
      undefined,
      companyProfile ?? undefined,
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
          <CardDescription>
            View the combined statement for all companies by date range
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
            <Button
              onClick={handleLoad}
              disabled={isLoadingStmt}
              className="gap-2 h-9"
            >
              {isLoadingStmt ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              Load Statement
            </Button>
            {entries.length > 0 && (
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                className="gap-2 h-9"
              >
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
                <CardTitle className="font-heading text-base">
                  Company Statement
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {fromDate} to {toDate} · {entries.length} entries
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total Balance</p>
                <p
                  className={`font-bold text-lg ${closingBalance > 0 ? "text-destructive" : "text-success"}`}
                >
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
                    <th className="text-left px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Store
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Debit (₹)
                    </th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Credit (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr
                      key={`${entry.referenceNumber}-${Number(entry.entryDate)}-${entry.storeNumber}`}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <td className="px-6 py-2 text-xs">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-4 py-2 text-xs font-medium">
                        {entry.companyName}
                      </td>
                      <td className="px-4 py-2 text-xs font-mono">
                        {entry.storeNumber}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.entryType}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono">
                        {entry.referenceNumber}
                      </td>
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
  const { actor, isFetching } = useExtendedActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const [selectedStore, setSelectedStore] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [chequeDetails, setChequeDetails] = useState("");
  const [utrDetails, setUtrDetails] = useState("");
  const [paymentAdviceImage, setPaymentAdviceImage] = useState("");
  const adviceImageRef = useRef<HTMLInputElement>(null);

  // Edit payment state
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editStore, setEditStore] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
  const [editChequeDetails, setEditChequeDetails] = useState("");
  const [editUtrDetails, setEditUtrDetails] = useState("");
  const [editAdviceImage, setEditAdviceImage] = useState("");
  const editAdviceImageRef = useRef<HTMLInputElement>(null);

  // Lightbox state for viewing payment advice image
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Delete payment state (admin only)
  const [deletingPayment, setDeletingPayment] = useState<Payment | null>(null);
  const [deletePaymentReason, setDeletePaymentReason] = useState("");
  const isAdminUser = !!localStorage.getItem("a1vs_admin_token");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["all-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const queryClient = useQueryClient();

  const { data: recentPayments = [], isLoading: paymentsLoading } = useQuery<
    Payment[]
  >({
    queryKey: ["all-payments", token],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayments(token);
    },
    enabled: !!actor && !isFetching && !!token,
  });

  const refreshPayments = () => {
    queryClient.invalidateQueries({ queryKey: ["all-payments", token] });
  };

  const selectedCustomer = customers.find(
    (c) => c.storeNumber === selectedStore,
  );

  const handleAdviceImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string) => void,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setter(base64);
  };

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Not connected");
      const amtNum = Number.parseFloat(amount);
      if (Number.isNaN(amtNum) || amtNum <= 0)
        throw new Error("Invalid amount");
      await actor.addPayment(
        token,
        selectedStore,
        selectedCustomer?.companyName ?? "",
        amtNum,
        paymentMethod,
        paymentMethod === "cheque" ? chequeDetails : null,
        paymentMethod === "online" ? utrDetails : null,
        paymentAdviceImage,
      );
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["all-payments", token] });
      setAmount("");
      setChequeDetails("");
      setUtrDetails("");
      setPaymentAdviceImage("");
      if (adviceImageRef.current) adviceImageRef.current.value = "";
      refreshPayments();
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to record payment",
      );
    },
  });

  const editPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!editingPayment) throw new Error("No payment selected");
      const amtNum = Number.parseFloat(editAmount);
      if (Number.isNaN(amtNum) || amtNum <= 0)
        throw new Error("Invalid amount");
      await actor!.editPayment(
        token,
        editingPayment.paymentId,
        editStore,
        editCompanyName,
        amtNum,
        editPaymentMethod,
        editPaymentMethod === "cheque" ? editChequeDetails || null : null,
        editPaymentMethod === "online" ? editUtrDetails || null : null,
        editAdviceImage || "",
      );
    },
    onSuccess: () => {
      toast.success("Payment updated");
      setEditingPayment(null);
      setEditAdviceImage("");
      if (editAdviceImageRef.current) editAdviceImageRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["all-payments", token] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update payment",
      );
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async () => {
      if (!deletingPayment) throw new Error("No payment selected");
      if (!deletePaymentReason.trim()) throw new Error("Reason is required");
      await actor!.softDeletePayment(
        token,
        deletingPayment.paymentId,
        deletePaymentReason.trim(),
      );
    },
    onSuccess: () => {
      toast.success("Payment deleted");
      setDeletingPayment(null);
      setDeletePaymentReason("");
      queryClient.invalidateQueries({ queryKey: ["all-payments", token] });
    },
    onError: (err) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete payment",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore) {
      toast.error("Please select a customer");
      return;
    }
    if (!amount || Number.parseFloat(amount) <= 0) {
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

  const sortedPayments = [...recentPayments].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Add Payment Form */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Record Payment
            </CardTitle>
            <CardDescription>
              Feed a payment received from a customer
            </CardDescription>
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

              {/* Payment Advice Image */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Advice (optional)</Label>
                <input
                  ref={adviceImageRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleAdviceImageChange(e, setPaymentAdviceImage)
                  }
                />
                {paymentAdviceImage ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setLightboxImage(paymentAdviceImage)}
                      className="shrink-0"
                    >
                      <img
                        src={paymentAdviceImage}
                        alt="Payment advice"
                        className="w-16 h-16 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity"
                      />
                    </button>
                    <div className="flex-1 text-xs text-muted-foreground">
                      Image attached
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setPaymentAdviceImage("");
                        if (adviceImageRef.current)
                          adviceImageRef.current.value = "";
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 h-9 w-full"
                    onClick={() => adviceImageRef.current?.click()}
                    data-ocid="accounts.payment.upload_button"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Upload Image
                  </Button>
                )}
              </div>

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
                {addPaymentMutation.isPending
                  ? "Recording..."
                  : "Record Payment"}
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
              {!paymentsLoading && (
                <Badge variant="secondary">{recentPayments.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((k) => (
                  <Skeleton key={k} className="h-12 w-full" />
                ))}
              </div>
            ) : sortedPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No payments recorded yet
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedPayments.map((payment) => (
                  <div
                    key={payment.paymentId}
                    className={`border rounded-lg p-3 ${payment.deleted ? "border-red-100 bg-red-50/30 opacity-75" : "border-border"}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {payment.companyName}
                        </p>
                        {payment.deleted && (
                          <Badge className="bg-red-100 text-red-700 border-0 text-[10px] shrink-0">
                            Deleted
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p
                          className={`font-bold ${payment.deleted ? "text-muted-foreground line-through" : "text-success"}`}
                        >
                          ₹{payment.amount.toFixed(2)}
                        </p>
                        {!payment.deleted && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0"
                              data-ocid="accounts.payment.edit_button"
                              onClick={() => {
                                setEditingPayment(payment);
                                setEditStore(payment.storeNumber);
                                setEditCompanyName(payment.companyName);
                                setEditAmount(payment.amount.toString());
                                setEditPaymentMethod(payment.paymentMethod);
                                setEditChequeDetails(
                                  payment.chequeDetails ?? "",
                                );
                                setEditUtrDetails(payment.utrDetails ?? "");
                                setEditAdviceImage(
                                  payment.paymentAdviceImage ?? "",
                                );
                              }}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            {isAdminUser && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 w-7 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                data-ocid="accounts.payment.delete_button"
                                onClick={() => {
                                  setDeletingPayment(payment);
                                  setDeletePaymentReason("");
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-xs capitalize">
                        {payment.paymentMethod}
                      </Badge>
                      <span>{formatDate(payment.timestamp)}</span>
                      <span className="font-mono">{payment.storeNumber}</span>
                    </div>
                    {payment.chequeDetails && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Cheque: {payment.chequeDetails}
                      </p>
                    )}
                    {payment.utrDetails && (
                      <p className="text-xs text-muted-foreground mt-1">
                        UTR: {payment.utrDetails}
                      </p>
                    )}
                    {payment.paymentAdviceImage && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxImage(payment.paymentAdviceImage ?? null)
                          }
                          title="View payment advice"
                        >
                          <img
                            src={payment.paymentAdviceImage}
                            alt="Payment advice"
                            className="w-12 h-12 rounded object-cover border border-border hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </button>
                      </div>
                    )}
                    {payment.deleted && payment.deleteReason && (
                      <p className="text-xs text-red-600 mt-1 font-medium">
                        Reason: {payment.deleteReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Delete Payment Dialog */}
      <Dialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
      >
        <DialogContent
          className="max-w-md"
          data-ocid="accounts.delete_payment.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-red-600">
              <Trash2 className="w-4 h-4" />
              Delete Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {deletingPayment && (
              <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <p className="text-sm font-semibold text-red-800">
                  {deletingPayment.companyName}
                </p>
                <p className="text-xs text-red-600 mt-0.5">
                  ₹{deletingPayment.amount.toFixed(2)} ·{" "}
                  <span className="capitalize">
                    {deletingPayment.paymentMethod}
                  </span>{" "}
                  · {formatDate(deletingPayment.timestamp)}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              This payment will be marked as deleted and excluded from balance
              calculations. The record will remain visible with a "Deleted"
              status and your reason shown.
            </p>
            <div className="space-y-2">
              <Label
                htmlFor="delete-payment-reason"
                className="text-sm font-medium"
              >
                Reason for Deletion <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="delete-payment-reason"
                placeholder="Enter reason for deletion..."
                value={deletePaymentReason}
                onChange={(e) => setDeletePaymentReason(e.target.value)}
                className="min-h-20 text-sm"
                data-ocid="accounts.delete_payment.textarea"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingPayment(null)}
              data-ocid="accounts.delete_payment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deletePaymentReason.trim() === "" ||
                deletePaymentMutation.isPending
              }
              onClick={() => deletePaymentMutation.mutate()}
              className="gap-2"
              data-ocid="accounts.delete_payment.confirm_button"
            >
              {deletePaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Advice Lightbox */}
      <Dialog
        open={!!lightboxImage}
        onOpenChange={(open) => !open && setLightboxImage(null)}
      >
        <DialogContent
          className="max-w-2xl p-2"
          data-ocid="accounts.payment_advice.dialog"
        >
          <DialogHeader className="px-3 pt-2 pb-1">
            <DialogTitle className="font-heading text-sm">
              Payment Advice
            </DialogTitle>
          </DialogHeader>
          {lightboxImage && (
            <img
              src={lightboxImage}
              alt="Payment advice full"
              className="w-full rounded-lg object-contain max-h-[70vh]"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Edit2 className="w-4 h-4 text-primary" />
              Edit Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer selector */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={editStore}
                onValueChange={(val) => {
                  setEditStore(val);
                  const customer = customers.find((c) => c.storeNumber === val);
                  setEditCompanyName(customer?.companyName ?? "");
                }}
              >
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

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-pay-amount">Amount (₹)</Label>
              <Input
                id="edit-pay-amount"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="0.00"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={editPaymentMethod}
                onValueChange={setEditPaymentMethod}
              >
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

            {/* Cheque Details */}
            {editPaymentMethod === "cheque" && (
              <div className="space-y-2">
                <Label htmlFor="edit-cheque-details">Cheque Details</Label>
                <Textarea
                  id="edit-cheque-details"
                  placeholder="Cheque number, bank name, date..."
                  value={editChequeDetails}
                  onChange={(e) => setEditChequeDetails(e.target.value)}
                  className="min-h-20 text-sm"
                />
              </div>
            )}

            {/* UTR Details */}
            {editPaymentMethod === "online" && (
              <div className="space-y-2">
                <Label htmlFor="edit-utr-details">UTR / Transaction ID</Label>
                <Input
                  id="edit-utr-details"
                  placeholder="UTR number or transaction reference"
                  value={editUtrDetails}
                  onChange={(e) => setEditUtrDetails(e.target.value)}
                />
              </div>
            )}

            {/* Payment Advice Image */}
            <div className="space-y-2">
              <Label className="text-sm">Payment Advice (optional)</Label>
              <input
                ref={editAdviceImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleAdviceImageChange(e, setEditAdviceImage)}
              />
              {editAdviceImage ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLightboxImage(editAdviceImage)}
                    className="shrink-0"
                  >
                    <img
                      src={editAdviceImage}
                      alt="Payment advice"
                      className="w-16 h-16 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity"
                    />
                  </button>
                  <div className="flex-1 text-xs text-muted-foreground">
                    Image attached
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setEditAdviceImage("");
                      if (editAdviceImageRef.current)
                        editAdviceImageRef.current.value = "";
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 h-9 w-full"
                  onClick={() => editAdviceImageRef.current?.click()}
                  data-ocid="accounts.edit_payment.upload_button"
                >
                  <ImagePlus className="w-4 h-4" />
                  Upload Image
                </Button>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingPayment(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                editPaymentMutation.isPending ||
                !editAmount ||
                Number.parseFloat(editAmount) <= 0
              }
              onClick={() => editPaymentMutation.mutate()}
              className="gap-2"
            >
              {editPaymentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Edit2 className="w-4 h-4" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Main Accounts Page
export default function Accounts() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Accounts</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Customer statements, company statement, and payment management
        </p>
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
