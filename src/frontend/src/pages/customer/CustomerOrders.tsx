import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShoppingBag, FileText } from "lucide-react";
import type { Order } from "../../backend.d";
import { generateInvoicePDF } from "../../utils/pdfUtils";

function formatDate(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "delivered") return <Badge className="bg-green-100 text-green-700 border-0 text-xs">Delivered</Badge>;
  if (s === "accepted") return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Accepted</Badge>;
  if (s === "on_the_way") return <Badge className="bg-orange-100 text-orange-700 border-0 text-xs">On the Way</Badge>;
  return <Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs">Pending</Badge>;
}

export default function CustomerOrders() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();

  const storeNumber = localStorage.getItem("a1vs_store_number") ?? "";
  const companyName = localStorage.getItem("a1vs_company_name") ?? "";
  const token = localStorage.getItem("a1vs_customer_token") ?? "";

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["customer-orders", storeNumber, token],
    queryFn: () => actor!.getOrdersByStore(token, storeNumber),
    enabled: !!actor && !isFetching && !!token && !!storeNumber,
  });

  const sortedOrders = [...orders].sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  return (
    <div className="space-y-5 pb-20 lg:pb-6">
      {/* Info header */}
      <div className="bg-white rounded-xl border border-green-100 p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-heading font-semibold text-sm text-green-900">Order History</p>
            <p className="text-xs text-green-600/70">{companyName} · Store #{storeNumber}</p>
          </div>
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((k) => <Skeleton key={k} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : sortedOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-green-100 p-12 text-center shadow-xs">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-green-200" />
          <p className="font-heading font-medium text-green-700">No orders yet</p>
          <p className="text-sm text-green-500 mt-1">Your order history will appear here</p>
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
          {sortedOrders.map((order) => (
            <div
              key={order.orderId}
              className="bg-white rounded-xl border border-green-100 p-4 shadow-xs"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-wrap gap-2 items-center">
                  {order.invoiceNumber ? (
                    <Badge variant="outline" className="font-mono text-xs border-green-200 text-green-700">
                      INV# {order.invoiceNumber}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="font-mono text-xs border-green-200 text-green-700">
                      PO# {order.poNumber}
                    </Badge>
                  )}
                  <StatusBadge status={order.status} />
                </div>
                <span className="text-xs text-green-600/60">{formatDate(order.timestamp)}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {order.items.map((item) => (
                  <Badge key={item.productId.toString()} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-100">
                    {item.productName} × {item.qty.toString()} {item.unit}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-green-600/60">Total</p>
                    <p className="font-bold text-sm text-green-700">₹{order.totalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-600/60">Payment</p>
                    <p className="text-xs font-medium text-green-800">
                      {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod === "pay_later" ? "Pay Later" : order.paymentMethod}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                  onClick={() => {
                    try {
                      generateInvoicePDF(order);
                    } catch {
                      toast.error("Failed to generate PDF");
                    }
                  }}
                >
                  <FileText className="w-3 h-3" />
                  {order.status === "delivered" && order.invoiceNumber ? "Invoice PDF" : "PO PDF"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
