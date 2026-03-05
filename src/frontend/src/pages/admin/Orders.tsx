import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useQuery as useReactQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  FileText,
  Loader2,
  PackageCheck,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
  User,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type {
  CompanyProfile,
  Order,
  OrderItem,
  RiderAssignment,
  RiderProfile,
  SubUser,
} from "../../backend.d";
import type { Product } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import {
  generateInvoicePDF,
  generateInvoicePDFAndPrint,
} from "../../utils/pdfUtils";

// Rider assignment helpers -- all backed by the canister, not localStorage
interface RiderAssignmentLocal {
  riderEmail: string;
  riderName: string;
  riderPhone: string;
}

function formatDate(timestamp: bigint) {
  const ms = Number(timestamp) / 1_000_000;
  return new Date(ms).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "delivered")
    return (
      <Badge className="bg-success/15 text-success border-0">Delivered</Badge>
    );
  if (s === "accepted")
    return (
      <Badge className="bg-blue-500/15 text-blue-600 border-0">Accepted</Badge>
    );
  if (s === "on_the_way")
    return (
      <Badge className="bg-orange-500/15 text-orange-600 border-0">
        On the Way
      </Badge>
    );
  if (s === "deleted")
    return <Badge className="bg-red-100 text-red-700 border-0">Deleted</Badge>;
  return (
    <Badge className="bg-warning-custom/15 text-warning-custom border-0">
      Pending
    </Badge>
  );
}

interface EditableOrderItem {
  productId: bigint;
  productName: string;
  qty: number;
  rate: number;
  unit: string;
}

export default function Orders() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editItems, setEditItems] = useState<EditableOrderItem[]>([]);
  const [deletingOrder, setDeletingOrder] = useState<Order | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  // Rider assignment states
  const [assignRiderOrder, setAssignRiderOrder] = useState<Order | null>(null);
  const [selectedRiderEmail, setSelectedRiderEmail] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders", token],
    queryFn: () => actor!.getAllOrders(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const { data: companyProfile } = useReactQuery<CompanyProfile>({
    queryKey: ["company-profile"],
    queryFn: () => actor!.getCompanyProfile(),
    enabled: !!actor && !isFetching,
  });

  const { data: allProducts = [] } = useReactQuery<Product[]>({
    queryKey: ["active-products"],
    queryFn: () => actor!.getActiveProducts(),
    enabled: !!actor && !isFetching,
  });

  const { data: allSubUsers = [] } = useReactQuery<SubUser[]>({
    queryKey: ["sub-users", token],
    queryFn: () => actor!.getAllSubUsers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const { data: riderAssignmentsArr = [] } = useReactQuery<RiderAssignment[]>({
    queryKey: ["rider-assignments", token],
    queryFn: () => actor!.getAllRiderAssignments(token),
    enabled: !!actor && !isFetching && !!token,
    refetchInterval: 15_000,
  });

  const { data: riderProfilesArr = [] } = useReactQuery<RiderProfile[]>({
    queryKey: ["rider-profiles", token],
    queryFn: () => actor!.getAllRiderProfiles(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const riders = allSubUsers.filter((u) => u.roleText === "rider" && u.active);

  // Convert arrays to lookup maps for quick access
  const riderAssignments: Record<string, RiderAssignmentLocal> = {};
  for (const ra of riderAssignmentsArr) {
    riderAssignments[ra.orderId] = {
      riderEmail: ra.riderEmail,
      riderName: ra.riderName,
      riderPhone: ra.riderPhone,
    };
  }
  const riderProfiles: Record<string, { name: string; phone: string }> = {};
  for (const rp of riderProfilesArr) {
    riderProfiles[rp.email] = { name: rp.name, phone: rp.phone };
  }

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: { orderId: string; status: string }) => {
      setUpdatingId(orderId);
      return actor!.updateOrderStatus(token, orderId, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order status updated");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to update status";
      toast.error(msg);
    },
    onSettled: () => setUpdatingId(null),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async () => {
      if (!deletingOrder) throw new Error("No order selected");
      return actor!.deleteOrder(token, deletingOrder.orderId, deleteReason);
    },
    onSuccess: () => {
      toast.success("Order deleted");
      setDeletingOrder(null);
      setDeleteReason("");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to delete order";
      toast.error(msg);
    },
  });

  const editItemsMutation = useMutation({
    mutationFn: async ({
      orderId,
      items,
    }: { orderId: string; items: OrderItem[] }) => {
      return actor!.editOrderItems(token, orderId, items);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Order items updated");
      setEditingOrder(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to edit order";
      toast.error(msg);
    },
  });

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditItems(
      order.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: Number(item.qty),
        rate: item.rate,
        unit: item.unit,
      })),
    );
  };

  const handleSaveEdit = () => {
    if (!editingOrder) return;
    const items: OrderItem[] = editItems.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      qty: BigInt(item.qty),
      rate: item.rate,
      unit: item.unit,
    }));
    editItemsMutation.mutate({ orderId: editingOrder.orderId, items });
  };

  const addProductToEdit = (product: Product) => {
    const existing = editItems.find((i) => i.productId === product.id);
    if (existing) {
      setEditItems((prev) =>
        prev.map((i) =>
          i.productId === product.id ? { ...i, qty: i.qty + 1 } : i,
        ),
      );
    } else {
      setEditItems((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          qty: 1,
          rate: product.rate,
          unit: product.unit,
        },
      ]);
    }
  };

  const updateEditItemQty = (productId: bigint, newQty: number) => {
    if (newQty <= 0) {
      setEditItems((prev) => prev.filter((i) => i.productId !== productId));
    } else {
      setEditItems((prev) =>
        prev.map((i) =>
          i.productId === productId ? { ...i, qty: newQty } : i,
        ),
      );
    }
  };

  const updateEditItemRate = (productId: bigint, newRate: number) => {
    setEditItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, rate: newRate } : i,
      ),
    );
  };

  const filtered = orders
    .filter((o) => {
      const matchSearch =
        search.trim() === "" ||
        o.storeNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.companyName.toLowerCase().includes(search.toLowerCase()) ||
        o.orderId.toLowerCase().includes(search.toLowerCase()) ||
        o.poNumber.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

  const getNextStatusButton = (order: Order) => {
    const s = order.status.toLowerCase();
    const assignment = riderAssignments[order.orderId];
    if (s === "pending") {
      return (
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700"
          disabled={updatingId === order.orderId}
          onClick={() => {
            setAssignRiderOrder(order);
            setSelectedRiderEmail("");
          }}
        >
          {updatingId === order.orderId ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          Accept
        </Button>
      );
    }
    if (s === "accepted") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {assignment && (
            <>
              <Badge className="bg-indigo-100 text-indigo-700 border-0 gap-1 text-xs">
                <Truck className="w-3 h-3" />
                {assignment.riderName}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-indigo-600 hover:bg-indigo-50"
                onClick={() => {
                  setAssignRiderOrder(order);
                  setSelectedRiderEmail(assignment.riderEmail);
                }}
              >
                <UserCheck className="w-3 h-3" />
                Re-assign
              </Button>
            </>
          )}
          {!assignment && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
              onClick={() => {
                setAssignRiderOrder(order);
                setSelectedRiderEmail("");
              }}
            >
              <User className="w-3 h-3" />
              Assign Rider
            </Button>
          )}
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs bg-orange-500 hover:bg-orange-600"
            disabled={updatingId === order.orderId}
            onClick={() =>
              updateStatusMutation.mutate({
                orderId: order.orderId,
                status: "on_the_way",
              })
            }
          >
            {updatingId === order.orderId ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Truck className="w-3 h-3" />
            )}
            On the Way
          </Button>
        </div>
      );
    }
    if (s === "on_the_way") {
      return (
        <div className="flex items-center gap-2 flex-wrap">
          {assignment && (
            <>
              <Badge className="bg-indigo-100 text-indigo-700 border-0 gap-1 text-xs">
                <Truck className="w-3 h-3" />
                {assignment.riderName}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs gap-1 text-indigo-600 hover:bg-indigo-50"
                onClick={() => {
                  setAssignRiderOrder(order);
                  setSelectedRiderEmail(assignment.riderEmail);
                }}
              >
                <UserCheck className="w-3 h-3" />
                Re-assign
              </Button>
            </>
          )}
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs bg-success hover:bg-success/90"
            disabled={updatingId === order.orderId}
            onClick={() =>
              updateStatusMutation.mutate({
                orderId: order.orderId,
                status: "delivered",
              })
            }
          >
            {updatingId === order.orderId ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <PackageCheck className="w-3 h-3" />
            )}
            Mark Delivered
          </Button>
        </div>
      );
    }
    if (s === "delivered") {
      return (
        <Badge className="bg-success/15 text-success border-0 gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Invoice Ready
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Purchase Orders</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage delivery workflow — Accept → On the Way → Delivered
        </p>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              All Purchase Orders
              {!isLoading && (
                <Badge variant="secondary" className="ml-2">
                  {orders.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="on_the_way">On the Way</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="deleted">Deleted</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search PO, store, company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {["o1", "o2", "o3", "o4", "o5"].map((k) => (
                <Skeleton key={k} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {search ? "No orders match your search" : "No orders yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => (
                <div
                  key={order.orderId}
                  className="border border-border rounded-xl p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <Badge
                        variant="outline"
                        className="font-mono font-bold text-xs"
                      >
                        {order.invoiceNumber
                          ? `INV# ${order.invoiceNumber}`
                          : `PO# ${order.poNumber}`}
                      </Badge>
                      <StatusBadge status={order.status} />
                      {order.status !== "deleted" && (
                        <Badge
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {order.paymentMethod === "cod"
                            ? "Cash on Delivery"
                            : order.paymentMethod === "pay_later"
                              ? "Pay Later"
                              : order.paymentMethod}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(order.timestamp)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Store / Company
                      </p>
                      <p className="font-semibold">
                        {order.storeNumber} · {order.companyName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.address}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Total Amount
                      </p>
                      <p className="font-bold text-primary">
                        ₹{order.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Items ({order.items.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {order.items.map((item) => (
                        <Badge
                          key={item.productId.toString()}
                          variant="secondary"
                          className="text-xs"
                        >
                          {item.productName} × {item.qty.toString()} {item.unit}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {order.deleteReason && (
                    <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">
                        <span className="font-semibold">Delete Reason:</span>{" "}
                        {order.deleteReason}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {order.status !== "deleted" && getNextStatusButton(order)}
                    {order.status !== "delivered" &&
                      order.status !== "deleted" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 h-8 text-xs"
                          onClick={() => openEditModal(order)}
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit PO
                        </Button>
                      )}
                    {order.status !== "deleted" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          setDeletingOrder(order);
                          setDeleteReason("");
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    )}
                    {order.status !== "deleted" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          generateInvoicePDF(order, companyProfile ?? undefined)
                        }
                      >
                        <FileText className="w-3 h-3" />
                        {order.status === "delivered" && order.invoiceNumber
                          ? "Invoice PDF"
                          : "PO PDF"}
                      </Button>
                    )}
                    {order.status === "delivered" && order.invoiceNumber && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          generateInvoicePDFAndPrint(
                            order,
                            companyProfile ?? undefined,
                          )
                        }
                      >
                        <FileText className="w-3 h-3" />
                        Print Invoice
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Order Dialog */}
      <Dialog
        open={!!deletingOrder}
        onOpenChange={(open) => !open && setDeletingOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-red-600">
              <Trash2 className="w-4 h-4" />
              Delete Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              You are about to delete{" "}
              <span className="font-semibold text-foreground">
                PO# {deletingOrder?.poNumber}
              </span>
              . The order will remain visible with a "Deleted" status and the
              reason shown as a note.
            </p>
            <div className="space-y-2">
              <Label htmlFor="delete-reason" className="text-sm font-medium">
                Reason for Deletion <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="delete-reason"
                placeholder="Enter reason for deletion..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="min-h-20 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingOrder(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                deleteReason.trim() === "" || deleteOrderMutation.isPending
              }
              onClick={() => deleteOrderMutation.mutate()}
              className="gap-2"
            >
              {deleteOrderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog
        open={!!editingOrder}
        onOpenChange={(open) => !open && setEditingOrder(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Edit PO# {editingOrder?.poNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Current items */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Order Items
              </Label>
              {editItems.map((item) => (
                <div
                  key={item.productId.toString()}
                  className="flex items-center gap-2 border border-border rounded-lg p-2"
                >
                  <span className="flex-1 text-sm font-medium truncate">
                    {item.productName}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-center">
                    {item.unit}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={item.qty}
                    onChange={(e) =>
                      updateEditItemQty(
                        item.productId,
                        Number.parseInt(e.target.value) || 0,
                      )
                    }
                    className="h-7 w-16 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">qty</span>
                  <span className="text-xs text-muted-foreground">@</span>
                  <Input
                    type="number"
                    min={0}
                    value={item.rate}
                    onChange={(e) =>
                      updateEditItemRate(
                        item.productId,
                        Number.parseFloat(e.target.value) || 0,
                      )
                    }
                    className="h-7 w-16 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground">₹</span>
                  <span className="text-xs font-semibold w-16 text-right">
                    ₹{(item.qty * item.rate).toFixed(0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateEditItemQty(item.productId, 0)}
                    className="w-6 h-6 rounded flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add products */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Add Products
              </Label>
              <div className="max-h-40 overflow-y-auto border border-border rounded-lg">
                {allProducts
                  .filter((p) => p.active)
                  .map((product) => (
                    <button
                      key={product.id.toString()}
                      type="button"
                      onClick={() => addProductToEdit(product)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between border-b border-border/50 last:border-0"
                    >
                      <span>
                        {product.name}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({product.unit})
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Plus className="w-3 h-3" />₹{product.rate}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center font-bold border-t border-border pt-3">
              <span>Updated Total:</span>
              <span className="text-primary">
                ₹
                {editItems
                  .reduce((sum, i) => sum + i.qty * i.rate, 0)
                  .toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setEditingOrder(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editItemsMutation.isPending || editItems.length === 0}
              className="flex-1 gap-2"
            >
              {editItemsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Rider Dialog */}
      <Dialog
        open={!!assignRiderOrder}
        onOpenChange={(open) => !open && setAssignRiderOrder(null)}
      >
        <DialogContent
          className="max-w-sm"
          data-ocid="admin.assign_rider.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-indigo-900">
              <Truck className="w-5 h-5 text-indigo-600" />
              Assign Rider & Accept Order
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="bg-indigo-50 rounded-lg px-3 py-2">
              <p className="text-xs text-indigo-700">
                <span className="font-semibold">
                  PO# {assignRiderOrder?.poNumber}
                </span>
                {" · "}
                {assignRiderOrder?.companyName}
              </p>
              <p className="text-xs text-indigo-500 mt-0.5 truncate">
                {assignRiderOrder?.address}
              </p>
            </div>
            {riders.length === 0 ? (
              <div className="text-center py-4">
                <Truck className="w-8 h-8 mx-auto mb-2 text-indigo-200" />
                <p className="text-sm font-medium text-indigo-700">
                  No riders available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Go to Users to create a Rider account first.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Select Rider</Label>
                <Select
                  value={selectedRiderEmail}
                  onValueChange={setSelectedRiderEmail}
                  data-ocid="admin.assign_rider.select"
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Choose a rider..." />
                  </SelectTrigger>
                  <SelectContent>
                    {riders.map((rider) => {
                      const profile = riderProfiles[rider.email];
                      return (
                        <SelectItem key={rider.email} value={rider.email}>
                          <div className="flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{profile?.name ?? rider.email}</span>
                            {profile?.phone && (
                              <span className="text-xs text-muted-foreground font-mono">
                                <Phone className="w-2.5 h-2.5 inline mr-0.5" />
                                {profile.phone}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setAssignRiderOrder(null)}
              data-ocid="admin.assign_rider.skip_button"
              disabled={isAssigning}
            >
              Cancel
            </Button>
            {riders.length > 0 && (
              <Button
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                disabled={!selectedRiderEmail || isAssigning}
                data-ocid="admin.assign_rider.confirm_button"
                onClick={async () => {
                  if (!assignRiderOrder || !selectedRiderEmail) return;
                  const profile = riderProfiles[selectedRiderEmail];
                  const riderName = profile?.name ?? selectedRiderEmail;
                  const riderPhone = profile?.phone ?? "";
                  setIsAssigning(true);
                  try {
                    // Accept the order first
                    await actor!.updateOrderStatus(
                      token,
                      assignRiderOrder.orderId,
                      "accepted",
                    );
                    // Save rider assignment to backend (not localStorage)
                    await actor!.assignRider(
                      token,
                      assignRiderOrder.orderId,
                      selectedRiderEmail,
                      riderName,
                      riderPhone,
                    );
                    qc.invalidateQueries({ queryKey: ["admin-orders"] });
                    qc.invalidateQueries({ queryKey: ["rider-assignments"] });
                    toast.success(
                      `Order accepted and assigned to ${riderName}`,
                    );
                    setAssignRiderOrder(null);
                    setSelectedRiderEmail("");
                  } catch (err: unknown) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to accept order",
                    );
                  } finally {
                    setIsAssigning(false);
                  }
                }}
              >
                {isAssigning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Truck className="w-4 h-4" />
                )}
                Assign & Accept
              </Button>
            )}
            <Button
              variant="ghost"
              className="gap-2"
              disabled={isAssigning}
              onClick={async () => {
                if (!assignRiderOrder) return;
                setIsAssigning(true);
                try {
                  await actor!.updateOrderStatus(
                    token,
                    assignRiderOrder.orderId,
                    "accepted",
                  );
                  qc.invalidateQueries({ queryKey: ["admin-orders"] });
                  toast.success("Order accepted without rider assignment");
                  setAssignRiderOrder(null);
                } catch (err: unknown) {
                  toast.error(
                    err instanceof Error
                      ? err.message
                      : "Failed to accept order",
                  );
                } finally {
                  setIsAssigning(false);
                }
              }}
            >
              Accept Without Rider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
