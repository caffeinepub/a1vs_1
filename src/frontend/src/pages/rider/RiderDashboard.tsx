import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Truck,
  User,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Order, RiderAssignment } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import {
  playDeliverySuccess,
  playPhoneRing,
  requestNotificationPermission,
  showBrowserNotification,
} from "../../utils/audioUtils";

function formatDate(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusOrder: Record<string, number> = {
  pending: 0,
  accepted: 1,
  on_the_way: 2,
  delivered: 3,
};

// Delivery roadmap stepper for rider
function DeliveryRoadmap({
  order,
  assignment,
}: {
  order: Order;
  assignment: RiderAssignment | null;
}) {
  const currentStep = statusOrder[order.status.toLowerCase()] ?? 0;

  const steps = [
    {
      key: "pickup",
      label: "Pickup",
      sublabel: "Order collected",
      icon: Package,
      done: currentStep >= 1,
    },
    {
      key: "rider",
      label: assignment?.riderName ?? "Rider",
      sublabel: assignment?.riderPhone ? assignment.riderPhone : "Contact",
      icon: User,
      isRider: true,
      done: currentStep >= 1,
      phone: assignment?.riderPhone,
    },
    {
      key: "on_the_way",
      label: "On the Way",
      sublabel: "In transit",
      icon: Truck,
      done: currentStep >= 2,
    },
    {
      key: "delivered",
      label: "Delivered",
      sublabel: "Completed",
      icon: CheckCircle2,
      done: currentStep >= 3,
    },
  ];

  return (
    <div className="bg-indigo-50/50 rounded-xl border border-indigo-100 p-3 mt-3">
      <p className="text-[10px] text-indigo-500 font-medium uppercase tracking-wider mb-3">
        Delivery Roadmap
      </p>
      <div className="flex items-start gap-0">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isLast = idx === steps.length - 1;
          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                    step.done
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-indigo-200 border border-indigo-100",
                  )}
                >
                  <StepIcon className="w-4 h-4" />
                </div>
                <span
                  className={cn(
                    "text-[9px] mt-1 text-center leading-tight max-w-[52px]",
                    step.done
                      ? "text-indigo-700 font-semibold"
                      : "text-indigo-300",
                  )}
                >
                  {step.label}
                </span>
                {"phone" in step && step.phone && step.done ? (
                  <a
                    href={`tel:${step.phone}`}
                    className="text-[9px] text-indigo-500 underline mt-0.5 max-w-[52px] text-center truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {step.phone}
                  </a>
                ) : (
                  <span className="text-[9px] text-indigo-300 mt-0.5 max-w-[52px] text-center truncate">
                    {step.sublabel}
                  </span>
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-1 rounded-full mt-[-20px] transition-all",
                    step.done && steps[idx + 1]?.done
                      ? "bg-indigo-500"
                      : "bg-indigo-100",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Signature pad dialog
function SignatureDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (signatureData: string) => void;
  isPending: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }, []);

  const getPos = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    isDrawingRef.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e1b4b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="rider.signature.dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2 text-indigo-900">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            Customer Signature
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please get the customer's signature to confirm delivery.
          </p>
          <div className="border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50/30 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={320}
              height={160}
              data-ocid="rider.signature.canvas_target"
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Sign in the box above
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={clearCanvas}
              className="flex-1 text-xs h-9"
              disabled={isPending}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 text-xs h-9 border-destructive/30 text-destructive hover:bg-destructive/5"
              data-ocid="rider.signature.cancel_button"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!hasSignature || isPending}
              className="flex-1 text-xs h-9 bg-indigo-600 hover:bg-indigo-700"
              data-ocid="rider.signature.confirm_button"
            >
              {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Product list for an order card
function OrderItemsList({ order }: { order: Order }) {
  const [showItems, setShowItems] = useState(false);

  return (
    <div className="mb-3">
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
        onClick={() => setShowItems((v) => !v)}
        data-ocid="rider.order.items.toggle"
      >
        <Package className="w-3 h-3" />
        {showItems ? "Hide Items" : "Show Items"}
        {showItems ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        <span className="text-indigo-400 font-normal">
          ({order.items.length} product{order.items.length !== 1 ? "s" : ""})
        </span>
      </button>
      {showItems && (
        <div className="mt-2 bg-indigo-50/40 rounded-lg border border-indigo-100 divide-y divide-indigo-100 overflow-hidden">
          {order.items.map((item) => (
            <div
              key={item.productId.toString()}
              className="flex items-center justify-between px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-indigo-900 truncate">
                  {item.productName}
                </span>
                <Badge
                  variant="secondary"
                  className="text-[9px] bg-indigo-100 text-indigo-600 border-0 shrink-0"
                >
                  {item.unit}
                </Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-indigo-600 font-semibold">
                  ×{item.qty.toString()}
                </span>
                <span className="text-[10px] text-indigo-400">
                  @ ₹{item.rate.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          <div className="flex justify-between px-3 py-2 bg-indigo-50">
            <span className="text-xs font-semibold text-indigo-700">Total</span>
            <span className="text-xs font-bold text-indigo-700">
              ₹{order.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Active order card
function ActiveOrderCard({
  order,
  assignment,
  index,
  onMarkOnTheWay,
  isUpdating,
}: {
  order: Order;
  assignment: RiderAssignment | null;
  index: number;
  onMarkOnTheWay: (orderId: string) => void;
  isUpdating: boolean;
}) {
  const [showSignature, setShowSignature] = useState(false);
  const { actor } = useActor();
  const qc = useQueryClient();
  const token = localStorage.getItem("a1vs_rider_token") ?? "";

  const deliverMutation = useMutation({
    mutationFn: async (signatureData: string) => {
      return actor!.markOrderDeliveredWithSignature(
        token,
        order.orderId,
        signatureData,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rider-orders"] });
      playDeliverySuccess();
      toast.success("Order delivered successfully! 🎉", {
        description: `${order.companyName} order delivered`,
      });
      setShowSignature(false);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update";
      toast.error(msg);
    },
  });

  const totalItems = order.items.reduce(
    (sum, item) => sum + Number(item.qty),
    0,
  );

  const handleNavigate = () => {
    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(order.address)}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      data-ocid={`rider.order.item.${index}`}
      className={cn(
        "bg-white rounded-2xl border shadow-sm overflow-hidden transition-all",
        order.status === "on_the_way"
          ? "border-orange-200 shadow-orange-50"
          : "border-indigo-100",
      )}
    >
      {/* Status ribbon */}
      <div
        className={cn(
          "h-1",
          order.status === "on_the_way" ? "bg-orange-400" : "bg-indigo-400",
        )}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="font-mono text-xs border-indigo-200 text-indigo-700 font-bold"
              >
                {order.invoiceNumber
                  ? `INV# ${order.invoiceNumber}`
                  : `PO# ${order.poNumber}`}
              </Badge>
              <Badge
                className={cn(
                  "text-xs border-0",
                  order.status === "on_the_way"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700",
                )}
              >
                {order.status === "on_the_way" ? "On the Way" : "Accepted"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {formatDateTime(order.timestamp)}
            </p>
          </div>
          <p className="font-heading font-bold text-indigo-700 text-base">
            ₹{order.totalAmount.toFixed(0)}
          </p>
        </div>

        {/* Customer Info */}
        <div className="bg-indigo-50/60 rounded-xl p-3 space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <User className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-indigo-900 truncate">
                {order.companyName}
              </p>
              <p className="text-xs text-indigo-500 font-mono">
                Store #{order.storeNumber}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
            <p className="text-xs text-indigo-600 leading-snug flex-1">
              {order.address}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50 shrink-0"
              onClick={handleNavigate}
              data-ocid={`rider.navigate.button.${index}`}
            >
              <Navigation className="w-3 h-3" />
              Navigate
            </Button>
          </div>
        </div>

        {/* Items summary line */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {order.items.length} product{order.items.length !== 1 ? "s" : ""},{" "}
            {totalItems} units
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground capitalize">
            {order.paymentMethod === "cod"
              ? "Cash on Delivery"
              : order.paymentMethod === "pay_later"
                ? "Pay Later"
                : order.paymentMethod}
          </span>
        </div>

        {/* Collapsible product list */}
        <OrderItemsList order={order} />

        {/* Delivery roadmap */}
        <DeliveryRoadmap order={order} assignment={assignment} />

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          {order.status === "accepted" && (
            <Button
              className="flex-1 h-11 text-sm font-semibold bg-orange-500 hover:bg-orange-600 text-white gap-2"
              data-ocid={`rider.on_the_way.button.${index}`}
              disabled={isUpdating}
              onClick={() => onMarkOnTheWay(order.orderId)}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Truck className="w-4 h-4" />
              )}
              On the Way
            </Button>
          )}
          {order.status === "on_the_way" && (
            <Button
              className="flex-1 h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              data-ocid={`rider.delivered.button.${index}`}
              disabled={isUpdating || deliverMutation.isPending}
              onClick={() => setShowSignature(true)}
            >
              {deliverMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      <SignatureDialog
        open={showSignature}
        onClose={() => setShowSignature(false)}
        onConfirm={(sig) => deliverMutation.mutate(sig)}
        isPending={deliverMutation.isPending}
      />
    </div>
  );
}

export default function RiderDashboard() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_rider_token") ?? "";
  const riderEmail = localStorage.getItem("a1vs_rider_email") ?? "";
  const qc = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const prevOrderCountRef = useRef<number | null>(null);

  // Fetch orders assigned to this rider directly from the backend
  const { data: myOrders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["rider-orders", token, riderEmail],
    queryFn: () => actor!.getOrdersForRider(token, riderEmail),
    enabled: !!actor && !isFetching && !!token && !!riderEmail,
    refetchInterval: 15_000,
  });

  // Fetch this rider's own assignment records (to get name/phone for roadmap)
  const { data: myAssignments = [] } = useQuery({
    queryKey: ["rider-assignments-me", token, riderEmail],
    queryFn: () => actor!.getAllRiderAssignments(token),
    enabled: !!actor && !isFetching && !!token,
    refetchInterval: 15_000,
  });

  // Build assignment lookup map keyed by orderId
  const assignmentMap: Record<
    string,
    { riderEmail: string; riderName: string; riderPhone: string }
  > = {};
  for (const a of myAssignments) {
    assignmentMap[a.orderId] = {
      riderEmail: a.riderEmail,
      riderName: a.riderName,
      riderPhone: a.riderPhone,
    };
  }

  const activeOrders = myOrders.filter(
    (o) => o.status === "accepted" || o.status === "on_the_way",
  );

  const historyOrders = myOrders
    .filter((o) => o.status === "delivered" || o.status === "deleted")
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  // Request notification permission eagerly on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Detect new orders and fire notification + sound
  useEffect(() => {
    if (prevOrderCountRef.current === null) {
      prevOrderCountRef.current = activeOrders.length;
      return;
    }
    if (activeOrders.length > prevOrderCountRef.current) {
      // Re-request permission in case user didn't grant it at mount
      if ("Notification" in window && Notification.permission === "default") {
        requestNotificationPermission();
      }
      playPhoneRing();
      showBrowserNotification(
        "New Delivery Order!",
        "A new order has been assigned to you. Open app to view.",
      );
      toast.info("🚨 New order assigned to you!", {
        duration: 6000,
      });
    }
    prevOrderCountRef.current = activeOrders.length;
  }, [activeOrders.length]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      setUpdatingId(orderId);
      return actor!.updateOrderStatusRider(token, orderId, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rider-orders"] });
      toast.success("Status updated");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update";
      toast.error(msg);
    },
    onSettled: () => setUpdatingId(null),
  });

  const handleMarkOnTheWay = (orderId: string) => {
    updateStatusMutation.mutate({ orderId, status: "on_the_way" });
  };

  // Group history by date
  const groupedHistory = historyOrders.reduce(
    (acc, order) => {
      const dateKey = formatDate(order.timestamp);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(order);
      return acc;
    },
    {} as Record<string, Order[]>,
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Stats banner */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.30 0.14 264) 0%, oklch(0.45 0.16 264) 100%)",
        }}
      >
        <div className="relative z-10">
          <p className="text-indigo-200 text-xs font-medium mb-1">
            Your Deliveries Today
          </p>
          <div className="flex items-center gap-4">
            <div>
              <p className="font-heading font-bold text-white text-2xl">
                {activeOrders.length}
              </p>
              <p className="text-indigo-200 text-xs">Active</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="font-heading font-bold text-white text-2xl">
                {
                  historyOrders.filter(
                    (o) =>
                      formatDate(o.timestamp) ===
                      formatDate(BigInt(Date.now()) * 1_000_000n),
                  ).length
                }
              </p>
              <p className="text-indigo-200 text-xs">Delivered Today</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div>
              <p className="font-heading font-bold text-white text-2xl">
                {historyOrders.length}
              </p>
              <p className="text-indigo-200 text-xs">Total Done</p>
            </div>
          </div>
        </div>
        {/* decorative */}
        <div className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-white/5" />
        <Truck className="absolute right-4 top-4 w-8 h-8 text-white/10" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList
          className="w-full bg-white border border-indigo-100"
          data-ocid="rider.dashboard.tab"
        >
          <TabsTrigger value="active" className="flex-1 gap-2 text-xs">
            <Truck className="w-3.5 h-3.5" />
            Active ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 gap-2 text-xs">
            <History className="w-3.5 h-3.5" />
            History ({historyOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Orders Tab */}
        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((k) => (
                <Skeleton key={k} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : activeOrders.length === 0 ? (
            <Card
              className="border-indigo-100 shadow-xs"
              data-ocid="rider.active_orders.empty_state"
            >
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-indigo-300" />
                </div>
                <p className="font-heading font-semibold text-indigo-700">
                  No active orders
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  New orders will appear here when assigned to you
                </p>
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  <div className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce" />
                  <div
                    className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-indigo-300 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4" data-ocid="rider.active_orders.list">
              {activeOrders.map((order, idx) => (
                <ActiveOrderCard
                  key={order.orderId}
                  order={order}
                  assignment={
                    assignmentMap[order.orderId]
                      ? {
                          orderId: order.orderId,
                          riderEmail: assignmentMap[order.orderId].riderEmail,
                          riderName: assignmentMap[order.orderId].riderName,
                          riderPhone: assignmentMap[order.orderId].riderPhone,
                        }
                      : null
                  }
                  index={idx + 1}
                  onMarkOnTheWay={handleMarkOnTheWay}
                  isUpdating={updatingId === order.orderId}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((k) => (
                <Skeleton key={k} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : historyOrders.length === 0 ? (
            <Card
              className="border-indigo-100 shadow-xs"
              data-ocid="rider.history.empty_state"
            >
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-indigo-200" />
                <p className="font-heading font-medium text-indigo-600">
                  No delivery history
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed deliveries will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5" data-ocid="rider.history.list">
              {Object.entries(groupedHistory).map(([dateKey, dateOrders]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {dateKey}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {dateOrders.map((order, idx) => {
                      return (
                        <div
                          key={order.orderId}
                          data-ocid={`rider.history.item.${idx + 1}`}
                          className="bg-white rounded-xl border border-indigo-50 p-3 flex items-center gap-3"
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                              order.status === "delivered"
                                ? "bg-emerald-50"
                                : "bg-red-50",
                            )}
                          >
                            {order.status === "delivered" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-semibold text-indigo-900 truncate">
                                {order.companyName}
                              </p>
                              <Badge
                                className={cn(
                                  "text-[9px] border-0 px-1.5 shrink-0",
                                  order.status === "delivered"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-red-100 text-red-600",
                                )}
                              >
                                {order.status === "delivered"
                                  ? "Delivered"
                                  : "Deleted"}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {order.invoiceNumber
                                ? `INV# ${order.invoiceNumber}`
                                : `PO# ${order.poNumber}`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {order.items.length} item
                              {order.items.length !== 1 ? "s" : ""}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {order.address}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-indigo-700">
                              ₹{order.totalAmount.toFixed(0)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDateTime(order.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
