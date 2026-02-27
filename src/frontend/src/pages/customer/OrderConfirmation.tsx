import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Leaf, ShoppingCart, RotateCcw, Building2, MapPin } from "lucide-react";

interface StoredCartItem {
  productId: string;
  productName: string;
  qty: number;
}

export default function OrderConfirmation() {
  const navigate = useNavigate();

  const storeNumber = localStorage.getItem("a1vs_store_number") ?? "";
  const companyName = localStorage.getItem("a1vs_company_name") ?? "";
  const address = localStorage.getItem("a1vs_address") ?? "";

  let cartItems: StoredCartItem[] = [];
  try {
    const raw = localStorage.getItem("a1vs_last_order_cart");
    if (raw) cartItems = JSON.parse(raw) as StoredCartItem[];
  } catch {
    cartItems = [];
  }

  const handlePlaceAnother = () => {
    localStorage.removeItem("a1vs_last_order_cart");
    navigate({ to: "/order" });
  };

  const totalQty = cartItems.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "oklch(0.97 0.01 148)" }}>
      {/* Header */}
      <header className="border-b border-border bg-white/90 backdrop-blur-sm shadow-xs">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Leaf className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-heading font-bold text-lg">A1VS</span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-6 animate-slide-up">
        {/* Success banner */}
        <div className="bg-white rounded-2xl border border-border p-6 text-center shadow-xs">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/15 mb-4">
            <CheckCircle2 className="w-9 h-9 text-success" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-success mb-1">Order Placed!</h1>
          <p className="text-sm text-muted-foreground">
            Your order has been received and will be processed shortly.
          </p>
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-xl border border-border p-4 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="font-mono">{storeNumber}</Badge>
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

        {/* Order Summary */}
        <Card className="shadow-xs">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span className="font-heading font-semibold text-sm">Order Summary</span>
              </div>
              <Badge className="bg-primary/10 text-primary border-0">
                {cartItems.length} products · {totalQty} units
              </Badge>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No order details found
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-[1fr_auto] text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2 border-b border-border">
                  <span>Product</span>
                  <span>Qty</span>
                </div>
                {cartItems.map((item, idx) => (
                  <div
                    key={item.productId}
                    className={`grid grid-cols-[1fr_auto] items-center px-5 py-3 text-sm ${
                      idx !== cartItems.length - 1 ? "border-b border-border/50" : ""
                    }`}
                  >
                    <span className="font-medium">{item.productName}</span>
                    <Badge variant="secondary" className="font-mono font-semibold">{item.qty}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          onClick={handlePlaceAnother}
          className="w-full h-12 text-base gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Place Another Order
        </Button>
      </main>

      <footer className="text-center py-4 text-xs text-muted-foreground border-t border-border">
        © 2026. Built with ♥ using{" "}
        <a href="https://caffeine.ai" className="underline hover:text-foreground transition-colors">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
