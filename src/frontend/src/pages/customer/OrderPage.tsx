import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  LogOut,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  Loader2,
  PackagePlus,
  CheckCircle2,
  Building2,
  MapPin,
  Truck,
  CreditCard,
  ArrowLeft,
} from "lucide-react";
import type { Product, OrderItem } from "../../backend.d";

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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "pay_later">("cod");

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["active-products"],
    queryFn: () => actor!.getActiveProducts(),
    enabled: !!actor && !isFetching,
  });

  const activeProducts = products.filter((p) => p.active);

  const filteredProducts = activeProducts.filter((p) =>
    p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem("a1vs_customer_token");
    localStorage.removeItem("a1vs_store_number");
    localStorage.removeItem("a1vs_company_name");
    localStorage.removeItem("a1vs_address");
    localStorage.removeItem("a1vs_gst_number");
    navigate({ to: "/" });
  };

  const openProductModal = () => {
    setSelectedProduct(null);
    setQty(1);
    setProductSearch("");
    setIsProductModalOpen(true);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setQty(1);
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    if (qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const existing = cart.find((c) => c.productId === selectedProduct.id);
    if (existing) {
      setCart((prev) =>
        prev.map((c) =>
          c.productId === selectedProduct.id
            ? { ...c, qty: c.qty + qty }
            : c
        )
      );
      toast.success(`Updated ${selectedProduct.name} quantity`);
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          qty,
          rate: selectedProduct.rate,
          unit: selectedProduct.unit,
        },
      ]);
      toast.success(`Added ${selectedProduct.name} to cart`);
    }

    setSelectedProduct(null);
    setQty(1);
    setProductSearch("");
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
      prev.map((c) => (c.productId === productId ? { ...c, qty: newQty } : c))
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
        paymentMethod
      );

      localStorage.setItem("a1vs_last_order_id", orderId);
      localStorage.setItem("a1vs_last_order_cart", JSON.stringify(cart.map((c) => ({
        ...c,
        productId: c.productId.toString(),
      }))));
      navigate({ to: "/order/confirmation" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to place order";
      toast.error(msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.97 0.01 148)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur-sm shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/uploads/A-One-Vegetables-LOGO-1.png"
              alt="A1VS Logo"
              className="h-8 w-8 object-contain"
              onError={(e) => (e.currentTarget as HTMLImageElement).style.display = "none"}
            />
            <div>
              <span className="font-heading font-bold text-sm leading-none">A1VS</span>
              <span className="hidden sm:block text-xs text-muted-foreground leading-none">AONE VEGETABLES & SUPPLIER</span>
            </div>
          </div>
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
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Store Info */}
        <div className="bg-white rounded-xl border border-border p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="font-mono">{storeNumber}</Badge>
            <span className="text-xs text-muted-foreground">Order Portal</span>
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
              <h2 className="font-heading font-semibold text-base">Select Payment Method</h2>
            </div>

            {/* Cart summary */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-xs">
              <p className="text-xs text-muted-foreground mb-2">Order Summary</p>
              <div className="space-y-1 mb-3">
                {cart.map((item) => (
                  <div key={item.productId.toString()} className="flex justify-between text-sm">
                    <span>{item.productName} × {item.qty} {item.unit}</span>
                    <span className="font-medium">₹{(item.qty * item.rate).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  paymentMethod === "cod" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <Truck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-heading font-semibold text-sm">Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground">Pay when your order arrives</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "cod" ? "border-primary" : "border-muted-foreground/30"
                }`}>
                  {paymentMethod === "cod" && <div className="w-3 h-3 rounded-full bg-primary" />}
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
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  paymentMethod === "pay_later" ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-heading font-semibold text-sm">Pay Later</p>
                  <p className="text-xs text-muted-foreground">Add to your account balance</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "pay_later" ? "border-primary" : "border-muted-foreground/30"
                }`}>
                  {paymentMethod === "pay_later" && <div className="w-3 h-3 rounded-full bg-primary" />}
                </div>
              </button>
            </div>

            <Button
              onClick={handlePlaceOrder}
              className="w-full h-12 text-base gap-2 shadow-lg"
              disabled={isPlacingOrder}
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
                <h2 className="font-heading font-semibold text-base">Your Order</h2>
                {cart.length > 0 && (
                  <Badge className="bg-primary/10 text-primary border-0">{totalItems} items</Badge>
                )}
              </div>
              <Button
                onClick={openProductModal}
                size="sm"
                className="gap-2 h-9"
                disabled={productsLoading || activeProducts.length === 0}
              >
                <PackagePlus className="w-4 h-4" />
                Add Item
              </Button>
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <div className="bg-white rounded-xl border border-border p-10 text-center shadow-xs">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-heading font-medium text-muted-foreground">Cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Press "Add Item" to start your order</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.productId.toString()}
                    className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-3 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.unit} · ₹{item.rate} each · Total: ₹{(item.qty * item.rate).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, item.qty - 1)}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => handleUpdateQty(item.productId, parseInt(e.target.value) || 1)}
                        className="w-12 text-center text-sm font-semibold border border-border rounded-lg h-7 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, item.qty + 1)}
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
                    <span className="text-sm text-muted-foreground">Order Total</span>
                    <span className="font-bold text-lg text-primary">₹{totalAmount.toFixed(2)}</span>
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
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Proceed to Payment · ₹{totalAmount.toFixed(2)}
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Product Selection Modal */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="font-heading">Select Product</DialogTitle>
          </DialogHeader>

          <div className="px-5 py-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                autoFocus
              />
            </div>
          </div>

          {!selectedProduct ? (
            <ScrollArea className="flex-1">
              <div className="px-5 py-3 space-y-1">
                {productsLoading ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading products...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No products found
                  </div>
                ) : (
                  filteredProducts.map((product) => {
                    const isInCart = cart.some((c) => c.productId === product.id);
                    return (
                      <button
                        key={product.id.toString()}
                        type="button"
                        onClick={() => handleSelectProduct(product)}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <span className="text-sm font-medium">{product.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {product.unit} · ₹{product.rate}
                          </span>
                        </div>
                        {isInCart ? (
                          <Badge className="bg-success/15 text-success border-0 text-xs">In cart</Badge>
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="px-5 py-4 space-y-4">
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground mb-0.5">Selected product</p>
                <p className="font-heading font-semibold">{selectedProduct.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selectedProduct.unit} · ₹{selectedProduct.rate} per {selectedProduct.unit.toLowerCase()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="qty-input">Quantity ({selectedProduct.unit})</Label>
                <Input
                  id="qty-input"
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-11 text-base font-semibold"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Estimated: ₹{(qty * selectedProduct.rate).toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1"
                >
                  ← Back
                </Button>
                <Button
                  onClick={handleAddToCart}
                  className="flex-1 gap-2"
                  disabled={qty < 1}
                >
                  <Plus className="w-4 h-4" />
                  Add to Cart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        © 2026. Built with ♥ using{" "}
        <a href="https://caffeine.ai" className="underline hover:text-foreground transition-colors">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
