import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  Heart,
  History,
  Leaf,
  Loader2,
  LogOut,
  MapPin,
  Minus,
  PackagePlus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Truck,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Order, OrderItem, Product } from "../../backend.d";
import { useActor } from "../../hooks/useActor";

interface CartItem {
  productId: bigint;
  productName: string;
  qty: number;
  rate: number;
  unit: string;
}

export default function OrderPage() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();

  const storeNumber = localStorage.getItem("a1vs_store_number") ?? "";
  const companyName = localStorage.getItem("a1vs_company_name") ?? "";
  const address = localStorage.getItem("a1vs_address") ?? "";
  const gstNumber = localStorage.getItem("a1vs_gst_number") ?? null;
  const token = localStorage.getItem("a1vs_customer_token") ?? "";

  // Favorites: stored in localStorage per store
  const favKey = `a1vs_favorites_${storeNumber}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(favKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = useCallback(
    (productId: bigint) => {
      const idStr = productId.toString();
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(idStr)) {
          next.delete(idStr);
        } else {
          next.add(idStr);
        }
        localStorage.setItem(favKey, JSON.stringify([...next]));
        return next;
      });
    },
    [favKey],
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const [showProductGrid, setShowProductGrid] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  // Per-product qty state in grid
  const [gridQtys, setGridQtys] = useState<Record<string, number>>({});
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "pay_later">(
    "cod",
  );

  const { data: products = [], isLoading: productsLoading } = useQuery<
    Product[]
  >({
    queryKey: ["active-products"],
    queryFn: () => actor!.getActiveProducts(),
    enabled: !!actor && !isFetching,
  });

  // Fetch customer order history for Repeat Orders
  const { data: orderHistory = [] } = useQuery<Order[]>({
    queryKey: ["customer-orders-history", token],
    queryFn: () => actor!.getAllCustomerOrders(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const activeProducts = products.filter((p) => p.active);

  const filteredProducts = activeProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()),
  );

  // Compute favorite products
  const favoriteProducts = useMemo(
    () => activeProducts.filter((p) => favorites.has(p.id.toString())),
    [activeProducts, favorites],
  );

  // Compute top repeat-ordered products from order history
  const repeatProducts = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const order of orderHistory) {
      for (const item of order.items) {
        const idStr = item.productId.toString();
        countMap[idStr] = (countMap[idStr] ?? 0) + 1;
      }
    }
    // Sort by frequency, take top 10
    const sorted = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([idStr]) => idStr);
    return activeProducts.filter((p) => sorted.includes(p.id.toString()));
  }, [orderHistory, activeProducts]);

  const handleLogout = () => {
    localStorage.removeItem("a1vs_customer_token");
    localStorage.removeItem("a1vs_store_number");
    localStorage.removeItem("a1vs_company_name");
    localStorage.removeItem("a1vs_address");
    localStorage.removeItem("a1vs_gst_number");
    navigate({ to: "/" });
  };

  const openProductGrid = () => {
    setProductSearch("");
    setShowProductGrid(true);
  };

  const getGridQty = (productId: bigint) => {
    return gridQtys[productId.toString()] ?? 1;
  };

  const setGridQty = (productId: bigint, qty: number) => {
    setGridQtys((prev) => ({
      ...prev,
      [productId.toString()]: Math.max(1, qty),
    }));
  };

  const handleAddToCartFromGrid = (product: Product) => {
    const qty = getGridQty(product.id);
    if (qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.productId === product.id ? { ...c, qty: c.qty + qty } : c,
        ),
      );
      toast.success(`Updated ${product.name} quantity`);
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          qty,
          rate: product.rate,
          unit: product.unit,
        },
      ]);
      toast.success(`Added ${product.name} to cart`);
    }
    // Reset qty for this product after adding
    setGridQtys((prev) => ({ ...prev, [product.id.toString()]: 1 }));
  };

  const handleUpdateCartItem = (product: Product) => {
    const qty = getGridQty(product.id);
    if (qty < 1) return;
    setCart((prev) =>
      prev.map((c) => (c.productId === product.id ? { ...c, qty } : c)),
    );
    toast.success(`Updated ${product.name} in cart`);
  };

  const handleRemoveFromCart = (productId: bigint) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const handleUpdateQty = (productId: bigint, newQty: number) => {
    if (newQty < 1) {
      handleRemoveFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((c) => (c.productId === productId ? { ...c, qty: newQty } : c)),
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.qty * item.rate, 0);
  const totalItems = cart.reduce((sum, c) => sum + c.qty, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      toast.error("Your cart is empty. Add items before placing an order.");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }

    setIsPlacingOrder(true);
    try {
      const items: OrderItem[] = cart.map((c) => ({
        productId: c.productId,
        productName: c.productName,
        qty: BigInt(c.qty),
        rate: c.rate,
        unit: c.unit,
      }));

      const orderId = await actor.placeOrderV2(
        token,
        storeNumber,
        companyName,
        address,
        gstNumber || null,
        items,
        paymentMethod,
      );

      localStorage.setItem("a1vs_last_order_id", orderId);
      localStorage.setItem(
        "a1vs_last_order_cart",
        JSON.stringify(
          cart.map((c) => ({
            ...c,
            productId: c.productId.toString(),
          })),
        ),
      );
      toast.success(`Order placed successfully! Order ID: ${orderId}`);
      navigate({ to: "/customer/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Compact product card for Favorites / Repeat Orders sections
  const CompactProductCard = ({
    product,
    sectionPrefix,
  }: {
    product: Product;
    sectionPrefix: string;
  }) => {
    const isInCart = cart.some((c) => c.productId === product.id);
    const cartItem = cart.find((c) => c.productId === product.id);
    const qty = getGridQty(product.id);
    const isFav = favorites.has(product.id.toString());

    return (
      <div
        className="bg-white rounded-lg border border-border shadow-xs overflow-hidden flex-shrink-0 w-28"
        data-ocid={`${sectionPrefix}.product.card`}
      >
        {/* Image with heart overlay */}
        <div className="relative h-14 w-full">
          {product.imageBase64 ? (
            <img
              src={product.imageBase64}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-green-50 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-green-300" />
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={`w-3 h-3 ${isFav ? "fill-red-500 text-red-500" : "text-gray-400"}`}
            />
          </button>
        </div>

        <div className="p-1.5 flex flex-col gap-1">
          <p className="font-medium text-[10px] leading-tight line-clamp-2">
            {product.name}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {product.unit} · ₹{product.rate}
          </p>
          {isInCart && (
            <Badge className="bg-success/10 text-success border-0 text-[8px] w-fit px-1 py-0">
              ✓ {cartItem?.qty}
            </Badge>
          )}
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={(e) =>
              setGridQty(product.id, Number.parseInt(e.target.value) || 1)
            }
            className="h-5 text-[10px] text-center font-semibold px-1"
          />
          {isInCart ? (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-5 text-[9px] px-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => handleUpdateCartItem(product)}
            >
              Update
            </Button>
          ) : (
            <Button
              size="sm"
              className="w-full h-5 text-[9px] px-1 gap-0.5"
              onClick={() => handleAddToCartFromGrid(product)}
            >
              <Plus className="w-2 h-2" />
              Add
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "oklch(0.97 0.01 148)" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur-sm shadow-xs">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/generated/a1vs-logo-clean-transparent.dim_400x400.png"
              alt="A1VS Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <span className="font-heading font-bold text-sm leading-none">
                A1VS
              </span>
              <span className="hidden sm:block text-xs text-muted-foreground leading-none">
                AONE VEGETABLES & SUPPLIER
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showProductGrid ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProductGrid(false)}
                className="text-muted-foreground hover:text-foreground gap-2"
                data-ocid="order.back_to_cart.button"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Back to Cart</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/customer/dashboard" })}
                className="text-muted-foreground hover:text-foreground gap-2"
                data-ocid="order.back_to_dashboard.button"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">Dashboard</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Product Grid Panel */}
      {showProductGrid ? (
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 flex flex-col">
          {/* Sticky search header */}
          <div className="sticky top-14 z-10 bg-white/95 backdrop-blur-sm border-b border-border pb-3 pt-2 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="font-heading font-semibold text-base flex-1">
                Select Products
              </h2>
              <Badge variant="secondary" className="text-xs">
                {activeProducts.length} items
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-ocid="order.product.search_input"
              />
            </div>
          </div>

          {/* ── Favorites & Repeat Orders (shown above main grid when no search) ── */}
          {!productSearch && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Favorites Section */}
              <div className="bg-white rounded-xl border border-rose-100 p-3 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2">
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  <span className="font-heading font-semibold text-xs text-red-600">
                    Favorites
                  </span>
                  {favoriteProducts.length > 0 && (
                    <Badge className="bg-red-50 text-red-500 border-0 text-[9px] px-1 ml-auto">
                      {favoriteProducts.length}
                    </Badge>
                  )}
                </div>
                {favoriteProducts.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-3 text-center"
                    data-ocid="order.favorites.empty_state"
                  >
                    <Heart className="w-6 h-6 text-rose-200 mb-1" />
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Tap ♥ on any product to add favorites
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {favoriteProducts.map((product) => (
                      <CompactProductCard
                        key={product.id.toString()}
                        product={product}
                        sectionPrefix="order.favorites"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Repeat Orders Section */}
              <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-xs">
                <div className="flex items-center gap-1.5 mb-2">
                  <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-heading font-semibold text-xs text-blue-600">
                    Repeat Orders
                  </span>
                  {repeatProducts.length > 0 && (
                    <Badge className="bg-blue-50 text-blue-500 border-0 text-[9px] px-1 ml-auto">
                      {repeatProducts.length}
                    </Badge>
                  )}
                </div>
                {repeatProducts.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-3 text-center"
                    data-ocid="order.repeat.empty_state"
                  >
                    <History className="w-6 h-6 text-blue-200 mb-1" />
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Your most ordered products appear here
                    </p>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {repeatProducts.map((product) => (
                      <CompactProductCard
                        key={product.id.toString()}
                        product={product}
                        sectionPrefix="order.repeat"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Product grid */}
          {productsLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i.toString()}
                  className="bg-white rounded-lg border border-border h-40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-muted-foreground"
              data-ocid="order.products.empty_state"
            >
              <Leaf className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pb-24">
              {filteredProducts.map((product) => {
                const isInCart = cart.some((c) => c.productId === product.id);
                const cartItem = cart.find((c) => c.productId === product.id);
                const gridQty = getGridQty(product.id);
                const isFav = favorites.has(product.id.toString());
                return (
                  <div
                    key={product.id.toString()}
                    className="bg-white rounded-lg border border-border shadow-xs overflow-hidden flex flex-col"
                    data-ocid="order.product.card"
                  >
                    {/* Image with heart overlay */}
                    <div className="relative h-16 sm:h-20 w-full">
                      {product.imageBase64 ? (
                        <img
                          src={product.imageBase64}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full bg-green-50 flex items-center justify-center">
                          <Leaf className="w-6 h-6 text-green-300" />
                        </div>
                      )}
                      {/* Favorite heart button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(product.id);
                        }}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
                        title={
                          isFav ? "Remove from favorites" : "Add to favorites"
                        }
                        data-ocid="order.product.toggle"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"}`}
                        />
                      </button>
                    </div>

                    {/* Info */}
                    <div className="p-1.5 flex flex-col flex-1 gap-1">
                      <div>
                        <p className="font-medium text-[11px] leading-tight line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {product.unit} · ₹{product.rate}
                        </p>
                      </div>

                      {/* In-cart badge */}
                      {isInCart && (
                        <Badge className="bg-success/10 text-success border-0 text-[9px] w-fit px-1 py-0">
                          ✓ {cartItem?.qty}
                        </Badge>
                      )}

                      {/* Qty input */}
                      <Input
                        type="number"
                        min={1}
                        value={gridQty}
                        onChange={(e) =>
                          setGridQty(
                            product.id,
                            Number.parseInt(e.target.value) || 1,
                          )
                        }
                        className="h-6 text-xs text-center font-semibold px-1"
                        data-ocid="order.product.input"
                      />

                      {/* Add / Update button */}
                      {isInCart ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-6 text-[10px] px-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleUpdateCartItem(product)}
                          data-ocid="order.product.save_button"
                        >
                          Update
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full h-6 text-[10px] px-1 gap-0.5"
                          onClick={() => handleAddToCartFromGrid(product)}
                          data-ocid="order.product.primary_button"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Sticky footer showing cart summary */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-border shadow-lg">
              <div className="max-w-5xl mx-auto px-4 py-3">
                <Button
                  className="w-full h-12 text-base gap-2 shadow-sm"
                  onClick={() => setShowProductGrid(false)}
                  data-ocid="order.view_cart.button"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Cart: {totalItems} items · ₹{totalAmount.toFixed(2)} → View
                  Cart
                </Button>
              </div>
            </div>
          )}
        </main>
      ) : (
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
          {/* Store Info */}
          <div className="bg-white rounded-xl border border-border p-4 space-y-2 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="font-mono">
                {storeNumber}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Order Portal
              </span>
            </div>
            <div className="flex gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">{companyName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-muted-foreground">{address}</span>
              </div>
            </div>
          </div>

          {/* Payment Selection Step */}
          {showPaymentStep ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentStep(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="font-heading font-semibold text-base">
                  Select Payment Method
                </h2>
              </div>

              {/* Cart summary */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
                <p className="text-xs text-muted-foreground mb-2">
                  Order Summary
                </p>
                <div className="space-y-1 mb-3">
                  {cart.map((item) => (
                    <div
                      key={item.productId.toString()}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.productName} × {item.qty} {item.unit}
                      </span>
                      <span className="font-medium">
                        ₹{(item.qty * item.rate).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment options */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === "cod"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 bg-white"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      paymentMethod === "cod"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-semibold text-sm">
                      Cash on Delivery
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pay when your order arrives
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "cod"
                        ? "border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {paymentMethod === "cod" && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("pay_later")}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                    paymentMethod === "pay_later"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 bg-white"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      paymentMethod === "pay_later"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-heading font-semibold text-sm">
                      Pay Later
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add to your account balance
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === "pay_later"
                        ? "border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {paymentMethod === "pay_later" && (
                      <div className="w-3 h-3 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              </div>

              <Button
                onClick={handlePlaceOrder}
                className="w-full h-12 text-base gap-2 shadow-lg"
                disabled={isPlacingOrder}
                data-ocid="order.place_order.submit_button"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Confirm & Place Order · ₹{totalAmount.toFixed(2)}
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Cart Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                  <h2 className="font-heading font-semibold text-base">
                    Your Order
                  </h2>
                  {cart.length > 0 && (
                    <Badge className="bg-primary/10 text-primary border-0">
                      {totalItems} items
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={openProductGrid}
                  size="sm"
                  className="gap-2 h-9"
                  disabled={productsLoading || activeProducts.length === 0}
                  data-ocid="order.add_item.button"
                >
                  <PackagePlus className="w-4 h-4" />
                  Add Item
                </Button>
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div
                  className="bg-white rounded-xl border border-border p-10 text-center shadow-xs"
                  data-ocid="order.cart.empty_state"
                >
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="font-heading font-medium text-muted-foreground">
                    Cart is empty
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Press "Add Item" to start your order
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div
                      key={item.productId.toString()}
                      className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3 shadow-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.unit} · ₹{item.rate} each · Total: ₹
                          {(item.qty * item.rate).toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQty(item.productId, item.qty - 1)
                          }
                          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            handleUpdateQty(
                              item.productId,
                              Number.parseInt(e.target.value) || 1,
                            )
                          }
                          className="w-12 text-center text-sm font-semibold border border-border rounded-lg h-7 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateQty(item.productId, item.qty + 1)
                          }
                          className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.productId)}
                          className="w-7 h-7 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Order total */}
                  <div className="bg-white rounded-xl border border-border px-4 py-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Order Total
                      </span>
                      <span className="font-bold text-lg text-primary">
                        ₹{totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Proceed to Payment */}
              {cart.length > 0 && (
                <div className="sticky bottom-4 pt-2">
                  <Button
                    onClick={() => setShowPaymentStep(true)}
                    className="w-full h-12 text-base gap-2 shadow-lg"
                    data-ocid="order.proceed_to_payment.button"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Proceed to Payment · ₹{totalAmount.toFixed(2)}
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()}. Built with ♥ using{" "}
        <a
          href="https://caffeine.ai"
          className="underline hover:text-foreground transition-colors"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
