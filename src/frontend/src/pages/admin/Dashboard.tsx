import { useQuery } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Users, Package, TrendingUp } from "lucide-react";
import type { Order } from "../../backend.d";

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

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "delivered") return <Badge className="bg-success/15 text-success border-0 font-medium">Delivered</Badge>;
  if (s === "processing") return <Badge className="bg-info/15 text-info border-0 font-medium">Processing</Badge>;
  return <Badge className="bg-warning-custom/15 text-warning-custom border-0 font-medium">Pending</Badge>;
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

  const recentOrders = [...orders]
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    .slice(0, 10);

  const isLoading = ordersLoading || customersLoading || productsLoading;

  const statsCards = [
    {
      title: "Total Orders",
      value: orders.length,
      icon: ShoppingCart,
      desc: "All time orders",
      color: "text-info",
    },
    {
      title: "Total Customers",
      value: customers.length,
      icon: Users,
      desc: "Registered stores",
      color: "text-success",
    },
    {
      title: "Total Products",
      value: products.length,
      icon: Package,
      desc: "Active products",
      color: "text-warning-custom",
    },
    {
      title: "Today's Orders",
      value: orders.filter((o) => {
        const ms = Number(o.timestamp) / 1_000_000;
        const today = new Date();
        const d = new Date(ms);
        return d.toDateString() === today.toDateString();
      }).length,
      icon: TrendingUp,
      desc: "Orders placed today",
      color: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of your vegetable ordering platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map(({ title, value, icon: Icon, desc, color }) => (
          <Card key={title} className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`w-4 h-4 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-heading font-bold">{value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {["s1", "s2", "s3", "s4", "s5"].map((k) => (
                <Skeleton key={k} className="h-10 w-full" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Order ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.orderId} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-3 font-mono text-xs text-muted-foreground">{order.orderId.slice(0, 8)}…</td>
                      <td className="px-4 py-3 font-medium">{order.storeNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{order.companyName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{order.items.length} items</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(order.timestamp)}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
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
