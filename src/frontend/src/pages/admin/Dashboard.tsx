import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Package,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import type { Order } from "../../backend.d";
import { useActor } from "../../hooks/useActor";

function formatDate(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isToday(timestamp: bigint): boolean {
  const ms = Number(timestamp) / 1_000_000;
  const d = new Date(ms);
  const today = new Date();
  return d.toDateString() === today.toDateString();
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "delivered")
    return (
      <Badge className="bg-success/15 text-success border-0 font-medium">
        Delivered
      </Badge>
    );
  if (s === "accepted")
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-0 font-medium">
        Accepted
      </Badge>
    );
  if (s === "on_the_way")
    return (
      <Badge className="bg-orange-500/15 text-orange-600 border-0 font-medium">
        On the Way
      </Badge>
    );
  return (
    <Badge className="bg-warning-custom/15 text-warning-custom border-0 font-medium">
      Pending
    </Badge>
  );
}

export default function Dashboard() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders", token],
    queryFn: () => actor!.getAllOrders(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["admin-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["active-products"],
    queryFn: () => actor!.getActiveProducts(),
    enabled: !!actor && !isFetching,
  });

  const isLoading = ordersLoading || customersLoading || productsLoading;

  // ── Computed stats ──────────────────────────────────────────────────────────
  const nonDeletedOrders = orders.filter((o) => o.status !== "deleted");
  const todayOrders = orders.filter(
    (o) => o.status !== "deleted" && isToday(o.timestamp),
  );
  const deliveredTodayOrders = orders.filter(
    (o) => o.status === "delivered" && isToday(o.timestamp),
  );
  const rejectedToday = orders.filter(
    (o) => o.status === "deleted" && isToday(o.timestamp),
  );
  const allTimeRejected = orders.filter((o) => o.status === "deleted");
  const revenueTodayNum = deliveredTodayOrders.reduce(
    (sum, o) => sum + o.totalAmount,
    0,
  );
  const avgCart =
    nonDeletedOrders.length > 0
      ? nonDeletedOrders.reduce((sum, o) => sum + o.totalAmount, 0) /
        nonDeletedOrders.length
      : 0;

  const statsCards = [
    {
      title: "Total Orders",
      value: orders.length,
      icon: ShoppingCart,
      desc: "All time orders",
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      title: "Total Customers",
      value: customers.length,
      icon: Users,
      desc: "Registered stores",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Total Products",
      value: products.length,
      icon: Package,
      desc: "Active products",
      color: "text-warning-custom",
      bg: "bg-warning-custom/10",
    },
    {
      title: "Today's Orders",
      value: todayOrders.length,
      icon: TrendingUp,
      desc: "Placed today",
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Revenue Today",
      value: `₹${revenueTodayNum.toFixed(0)}`,
      icon: Wallet,
      desc: "From delivered orders",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Avg. Cart Value",
      value: `₹${avgCart.toFixed(0)}`,
      icon: BarChart3,
      desc: "All time average",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      title: "Orders Placed Today",
      value: todayOrders.length,
      icon: ShoppingCart,
      desc: "New today",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Delivered Today",
      value: deliveredTodayOrders.length,
      icon: CheckCircle2,
      desc: "Completed deliveries",
      color: "text-green-700",
      bg: "bg-green-50",
    },
    {
      title: "Rejected Today",
      value: rejectedToday.length,
      icon: AlertCircle,
      desc: "Deleted orders today",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: "All Time Rejected",
      value: allTimeRejected.length,
      icon: XCircle,
      desc: "Total deleted orders",
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
  ];

  // Recent orders: exclude deleted, show 10 most recent, highlight delivered
  const recentOrders = [...orders]
    .filter((o) => o.status !== "deleted")
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of your vegetable ordering platform
        </p>
      </div>

      {/* Stats Grid — 2 cols mobile, 5 cols xl */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {statsCards.map(({ title, value, icon: Icon, desc, color, bg }) => (
          <Card key={title} className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">
                {title}
              </CardTitle>
              <div
                className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}
              >
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {isLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                <div
                  className={`text-2xl font-heading font-bold ${color} leading-tight`}
                >
                  {value}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">
                {desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-primary" />
            Recent Orders
            {!isLoading && recentOrders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {recentOrders.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="dashboard.orders.empty_state"
            >
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table
                className="w-full text-sm"
                data-ocid="dashboard.orders.table"
              >
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Store
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Items
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order, idx) => (
                    <tr
                      key={order.orderId}
                      data-ocid={`dashboard.orders.row.${idx + 1}`}
                      className={`border-b border-border/50 transition-colors ${
                        order.status === "delivered"
                          ? "bg-success/5 hover:bg-success/10"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                        {order.orderId.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {order.storeNumber}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {order.companyName}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">
                          {order.items.length} items
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(order.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
