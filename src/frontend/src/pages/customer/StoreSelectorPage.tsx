import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowRight, Store, Loader2, Building2, MapPin, ShoppingBag, FileBarChart, LayoutDashboard } from "lucide-react";
import { useActor } from "../../hooks/useActor";

type StoreInfo = {
  storeNumber: string;
  companyName: string;
  address: string;
  gstNumber?: string;
};

export default function StoreSelectorPage() {
  const navigate = useNavigate();
  const { actor, isFetching } = useActor();
  const [storeNumber, setStoreNumber] = useState("");
  const [password, setPassword] = useState("");
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
  const [isFindingStore, setIsFindingStore] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check if already logged in
  const isLoggedIn = !!localStorage.getItem("a1vs_customer_token");
  const currentStore = localStorage.getItem("a1vs_store_number");
  const currentCompany = localStorage.getItem("a1vs_company_name");

  const handleFindStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNumber.trim()) {
      toast.error("Please enter your store number");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again");
      return;
    }

    setIsFindingStore(true);
    try {
      const info = await actor.getCustomer(storeNumber.trim());
      if (!info) {
        toast.error("Store not found. Please check your store number.");
        setStoreInfo(null);
        return;
      }
      setStoreInfo(info);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to find store";
      toast.error(msg);
    } finally {
      setIsFindingStore(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Please enter your password");
      return;
    }
    if (!actor || !storeInfo) return;

    setIsLoggingIn(true);
    try {
      const token = await actor.customerLogin(storeNumber.trim(), password);
      localStorage.setItem("a1vs_customer_token", token);
      localStorage.setItem("a1vs_store_number", storeNumber.trim());
      localStorage.setItem("a1vs_company_name", storeInfo.companyName);
      localStorage.setItem("a1vs_address", storeInfo.address);
      localStorage.setItem("a1vs_gst_number", storeInfo.gstNumber ?? "");
      navigate({ to: "/customer/dashboard" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid password";
      toast.error(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("a1vs_customer_token");
    localStorage.removeItem("a1vs_store_number");
    localStorage.removeItem("a1vs_company_name");
    localStorage.removeItem("a1vs_address");
    localStorage.removeItem("a1vs_gst_number");
    window.location.reload();
  };

  const handleReset = () => {
    setStoreInfo(null);
    setStoreNumber("");
    setPassword("");
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg, oklch(0.96 0.02 148) 0%, oklch(0.92 0.04 148) 100%)" }}
    >
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "oklch(0.55 0.18 148)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-10"
          style={{ background: "oklch(0.65 0.14 85)" }}
        />
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-start px-4 py-10">
        {/* Logo & Hero */}
        <div className="text-center mb-8 animate-slide-up">
          <div className="flex flex-col items-center gap-3">
            <img
              src="/assets/uploads/A-One-Vegetables-LOGO-1.png"
              alt="A1VS Logo"
              className="h-24 w-24 object-contain drop-shadow-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1
                className="font-heading text-4xl font-bold tracking-tight"
                style={{ color: "oklch(0.20 0.05 148)" }}
              >
                A1VS
              </h1>
              <p className="text-xs tracking-widest uppercase mt-0.5 font-medium" style={{ color: "oklch(0.45 0.08 148)" }}>
                AONE VEGETABLES & SUPPLIER
              </p>
              <p className="mt-2 text-sm" style={{ color: "oklch(0.50 0.06 148)" }}>
                Fresh Vegetable &amp; Fruit Ordering Portal
              </p>
            </div>
          </div>
        </div>

        {/* Logged in — Show navigation cards */}
        {isLoggedIn ? (
          <div className="w-full max-w-md space-y-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {/* Welcome card */}
            <Card className="border-0 shadow-xl bg-white/95">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm">Welcome back!</p>
                    <p className="text-xs text-muted-foreground">{currentCompany} · Store #{currentStore}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Link to="/customer/dashboard">
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <LayoutDashboard className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-sm">Go to Dashboard</p>
                        <p className="text-xs text-muted-foreground">View orders, statement & tracking</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  <Link to="/order">
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-sm">Place New Order</p>
                        <p className="text-xs text-muted-foreground">Browse products and place order</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  <Link to="/customer/orders">
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-sm">My Orders</p>
                        <p className="text-xs text-muted-foreground">View order history & invoices</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                  <Link to="/customer/statement">
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <FileBarChart className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-sm">My Statement</p>
                        <p className="text-xs text-muted-foreground">Account statement & PDF download</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full mt-4 text-muted-foreground hover:text-destructive text-xs"
                >
                  Logout from {currentCompany}
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Login form */
          <Card
            className="w-full max-w-md shadow-xl border-0 animate-slide-up bg-white/95"
            style={{ animationDelay: "0.1s" }}
          >
            <CardContent className="p-6 space-y-5">
              {!storeInfo ? (
                <>
                  <div className="flex items-center gap-3 pb-2 border-b border-border">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Store className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold text-sm">Find Your Store</p>
                      <p className="text-xs text-muted-foreground">Enter your store number to continue</p>
                    </div>
                  </div>
                  <form onSubmit={handleFindStore} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="store-number">Store Number</Label>
                      <Input
                        id="store-number"
                        placeholder="e.g. STORE001"
                        value={storeNumber}
                        onChange={(e) => setStoreNumber(e.target.value)}
                        disabled={isFindingStore || isFetching}
                        className="h-11 text-base"
                        autoComplete="off"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-11 gap-2 font-medium"
                      disabled={isFindingStore || isFetching}
                    >
                      {isFindingStore ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Finding store...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                        <Store className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="font-heading font-semibold text-sm text-success">Store Found!</p>
                        <p className="text-xs text-muted-foreground">Confirm your details below</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                      <div className="flex gap-3">
                        <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Company</p>
                          <p className="font-semibold text-sm">{storeInfo.companyName}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-muted-foreground">Address</p>
                          <p className="text-sm">{storeInfo.address}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your store password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoggingIn}
                        className="h-11"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="flex-1 h-11"
                        disabled={isLoggingIn}
                      >
                        Change Store
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-11 gap-2 font-medium"
                        disabled={isLoggingIn}
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Logging in...
                          </>
                        ) : (
                          <>
                            Login
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Admin link */}
        <p className="mt-6 text-xs text-muted-foreground">
          Admin?{" "}
          <a href="/admin" className="underline hover:text-foreground transition-colors">
            Go to Admin Portal
          </a>
        </p>
      </div>

      {/* Footer */}
      <footer className="relative text-center py-4 text-xs text-muted-foreground">
        © 2026. Built with ♥ using{" "}
        <a href="https://caffeine.ai" className="underline hover:text-foreground transition-colors">
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
