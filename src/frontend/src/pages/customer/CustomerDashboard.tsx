import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileBarChart,
  Package,
  Phone,
  ShoppingBag,
  TrendingUp,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import type { Order, Payment } from "../../backend.d";
import { useExtendedActor } from "../../hooks/useExtendedActor";

interface RiderAssignment {
  riderEmail: string;
  riderName: string;
  riderPhone: string;
}

function getRiderAssignment(orderId: string): RiderAssignment | null {
  try {
    const all = JSON.parse(
      localStorage.getItem("a1vs_rider_assignments") ?? "{}",
    );
    return all[orderId] ?? null;
  } catch {
    return null;
  }
}

function formatDate(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type TrackStep = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: "pending" | "accepted" | "on_the_way" | "delivered";
};

const trackSteps: TrackStep[] = [
  { label: "Placed", icon: Clock, status: "pending" },
  { label: "Accepted", icon: Package, status: "accepted" },
  { label: "On the Way", icon: Truck, status: "on_the_way" },
  { label: "Delivered", icon: CheckCircle2, status: "delivered" },
];

const statusOrder: Record<string, number> = {
  pending: 0,
  accepted: 1,
  on_the_way: 2,
  delivered: 3,
};

function getStepIndex(status: string): number {
  return statusOrder[status.toLowerCase()] ?? 0;
}

function OrderTracker({ order }: { order: Order }) {
  const currentStep = getStepIndex(order.status);
  const riderAssignment = getRiderAssignment(order.orderId);
  const showRider =
    (order.status === "on_the_way" || order.status === "delivered") &&
    riderAssignment;

  return (
    <div
      className={cn(
        "bg-white rounded-xl border p-4 shadow-xs transition-all",
        order.status === "delivered"
          ? "border-green-200 bg-green-50/30"
          : "border-green-100",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="font-mono text-xs border-green-200 text-green-700"
            >
              {order.invoiceNumber
                ? `INV# ${order.invoiceNumber}`
                : `INV# ${order.poNumber}`}
            </Badge>
            <Badge
              className={cn(
                "text-xs border-0",
                order.status === "delivered"
                  ? "bg-green-100 text-green-700"
                  : order.status === "on_the_way"
                    ? "bg-orange-100 text-orange-700"
                    : order.status === "accepted"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-yellow-100 text-yellow-700",
              )}
            >
              {order.status === "on_the_way"
                ? "On the Way"
                : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
          <p className="text-xs text-green-600/70 mt-1">
            {formatDate(order.timestamp)} · {order.items.length} item
            {order.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <p className="font-bold text-green-700 text-sm">
          ₹{order.totalAmount.toFixed(2)}
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {trackSteps.map((step, idx) => {
          const StepIcon = step.icon;
          const done = idx <= currentStep;
          const isLast = idx === trackSteps.length - 1;

          return (
            <div key={step.label} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                    done
                      ? "bg-green-600 text-white shadow-sm"
                      : "bg-green-50 text-green-300 border border-green-100",
                  )}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={cn(
                    "text-[9px] mt-1 text-center leading-tight max-w-[48px] truncate",
                    done ? "text-green-700 font-medium" : "text-green-400",
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 rounded-full transition-all",
                    idx < currentStep ? "bg-green-500" : "bg-green-100",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Rider info when on the way or delivered */}
      {showRider && (
        <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-indigo-800">
              {riderAssignment.riderName}
            </p>
            <p className="text-[10px] text-indigo-500">Your delivery rider</p>
          </div>
          {riderAssignment.riderPhone && (
            <a
              href={`tel:${riderAssignment.riderPhone}`}
              className="flex items-center gap-1.5 bg-indigo-600 text-white rounded-full px-3 py-1.5 text-xs font-medium hover:bg-indigo-700 transition-colors shrink-0"
            >
              <Phone className="w-3 h-3" />
              Call Rider
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { actor, isFetching } = useExtendedActor();

  const storeNumber = localStorage.getItem("a1vs_store_number") ?? "";
  const companyName = localStorage.getItem("a1vs_company_name") ?? "";
  const token = localStorage.getItem("a1vs_customer_token") ?? "";

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["customer-orders", storeNumber, token],
    queryFn: () => actor!.getOrdersByStore(token, storeNumber),
    enabled: !!actor && !isFetching && !!token && !!storeNumber,
  });

  const { data: customerPayments = [] } = useQuery<Payment[]>({
    queryKey: ["customer-payments", storeNumber, token],
    queryFn: () => actor!.getPaymentsByStore(token, storeNumber),
    enabled: !!actor && !isFetching && !!token && !!storeNumber,
  });

  const sortedOrders = [...orders].sort(
    (a, b) => Number(b.timestamp) - Number(a.timestamp),
  );
  const recentOrders = sortedOrders.slice(0, 5);

  // Balance Due = only delivered invoices as debit, minus all non-deleted payments
  const totalDebit = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.totalAmount, 0);
  const totalCredit = customerPayments
    .filter((p) => !p.deleted)
    .reduce((sum, p) => sum + p.amount, 0);
  const closingBalance = totalDebit - totalCredit;

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Welcome header */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.35 0.12 148) 0%, oklch(0.50 0.14 148) 100%)",
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-xs font-medium mb-0.5">
                Welcome back
              </p>
              <h1 className="font-heading font-bold text-white text-xl leading-tight">
                {companyName}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-white/20 text-white border-0 text-xs font-mono backdrop-blur-sm">
                  Store #{storeNumber}
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-xs backdrop-blur-sm">
                  {orders.length} total orders
                </Badge>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
        {/* decorative */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white/5" />
      </div>

      {/* Account summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-white border-green-100 shadow-xs">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-green-50 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-green-800 leading-tight">
                Total Orders
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <>
                <p className="font-heading font-bold text-base sm:text-xl text-green-900 leading-tight">
                  {orders.length}
                </p>
                <p className="text-[9px] sm:text-xs text-green-600">placed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white border-green-100 shadow-xs">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-green-800 leading-tight">
                Total Purchase
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <>
                <p className="font-heading font-bold text-xs sm:text-base text-green-900 leading-tight">
                  ₹{totalDebit.toFixed(0)}
                </p>
                <p className="text-[9px] sm:text-xs text-green-600">billed</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white border-green-100 shadow-xs">
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className={cn(
                  "w-6 h-6 sm:w-7 sm:h-7 rounded-md flex items-center justify-center shrink-0",
                  closingBalance > 0 ? "bg-red-50" : "bg-emerald-50",
                )}
              >
                <Wallet
                  className={cn(
                    "w-3 h-3 sm:w-3.5 sm:h-3.5",
                    closingBalance > 0 ? "text-red-500" : "text-emerald-600",
                  )}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-green-800 leading-tight">
                Balance Due
              </span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <>
                <p
                  className={cn(
                    "font-heading font-bold text-xs sm:text-base leading-tight",
                    closingBalance > 0 ? "text-red-600" : "text-emerald-600",
                  )}
                >
                  ₹{closingBalance.toFixed(0)}
                </p>
                <p className="text-[9px] sm:text-xs text-green-600">
                  {closingBalance > 0 ? "due" : "paid"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => navigate({ to: "/order" })}
          className="h-auto py-3 flex-col gap-1.5 bg-green-600 hover:bg-green-700 text-white"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-xs font-medium">New Order</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/customer/orders" })}
          className="h-auto py-3 flex-col gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
        >
          <ClipboardList className="w-5 h-5" />
          <span className="text-xs font-medium">My Orders</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/customer/statement" })}
          className="h-auto py-3 flex-col gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
        >
          <FileBarChart className="w-5 h-5" />
          <span className="text-xs font-medium">Statement</span>
        </Button>
      </div>

      {/* Recent orders with tracking */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-green-900 text-sm">
            Recent Orders
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/customer/orders" })}
            className="text-green-600 hover:text-green-700 hover:bg-green-50 gap-1 text-xs h-7"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((k) => (
              <Skeleton key={k} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-green-100 p-10 text-center shadow-xs">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-green-200" />
            <p className="font-heading font-medium text-green-700 text-sm">
              No orders yet
            </p>
            <p className="text-xs text-green-500 mt-1">
              Place your first order to get started
            </p>
            <Button
              className="mt-4 gap-2 bg-green-600 hover:bg-green-700"
              size="sm"
              onClick={() => navigate({ to: "/order" })}
            >
              <ShoppingBag className="w-4 h-4" />
              Place First Order
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <OrderTracker key={order.orderId} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
