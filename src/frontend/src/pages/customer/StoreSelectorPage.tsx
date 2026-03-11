import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileBarChart,
  LayoutDashboard,
  Loader2,
  MapPin,
  ShoppingBag,
  Store,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../../hooks/useActor";
import {
  getFriendlyErrorMessage,
  isCanisterUnavailableError,
} from "../../utils/icErrorUtils";

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
  const [accountOnHold, setAccountOnHold] = useState(false);
  const [loginFailed, setLoginFailed] = useState(false);

  // Check if already logged in
  const isLoggedIn = !!localStorage.getItem("a1vs_customer_token");
  const currentStore = localStorage.getItem("a1vs_store_number");
  const currentCompany = localStorage.getItem("a1vs_company_name");

  const attemptFindStore = async (retries = 3): Promise<void> => {
    if (!actor) return;
    try {
      const info = await actor.getCustomer(storeNumber.trim());
      if (!info) {
        toast.error("Store not found. Please check your store number.");
        setStoreInfo(null);
        return;
      }
      setStoreInfo(info);
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptFindStore(retries - 1);
      }
      const msg = getFriendlyErrorMessage(
        err,
        "Store not found. Please check your store number.",
      );
      toast.error(msg);
    }
  };

  const handleFindStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeNumber.trim()) {
      toast.error("Please enter your store number");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again in a moment");
      return;
    }
    setIsFindingStore(true);
    try {
      await attemptFindStore();
    } finally {
      setIsFindingStore(false);
    }
  };

  const attemptLogin = async (retries = 3): Promise<void> => {
    if (!actor || !storeInfo) return;
    try {
      const token = await actor.customerLogin(storeNumber.trim(), password);
      localStorage.setItem("a1vs_customer_token", token);
      localStorage.setItem("a1vs_store_number", storeNumber.trim());
      localStorage.setItem("a1vs_company_name", storeInfo.companyName);
      localStorage.setItem("a1vs_address", storeInfo.address);
      localStorage.setItem("a1vs_gst_number", storeInfo.gstNumber ?? "");
      navigate({ to: "/customer/dashboard" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptLogin(retries - 1);
      }
      const errMsg = err instanceof Error ? err.message : String(err);
      // Check for account-on-hold error
      if (
        errMsg.includes("ACCOUNT_HOLD") ||
        (errMsg.toLowerCase().includes("account") &&
          errMsg.toLowerCase().includes("hold"))
      ) {
        setAccountOnHold(true);
        return;
      }
      const msg = getFriendlyErrorMessage(
        err,
        "Invalid password. Please try again.",
      );
      toast.error(msg);
      setLoginFailed(true);
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
      await attemptLogin();
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
    setLoginFailed(false);
    setAccountOnHold(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.96 0.02 148) 0%, oklch(0.92 0.04 148) 100%)",
      }}
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

      <div className="relative flex-1 flex flex-col items-center justify-start px-4 py-8">
        {/* Compact header with back button */}
        <div className="w-full max-w-md mb-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/splash" });
              }}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-white/70 transition-colors"
              style={{ color: "oklch(0.35 0.08 148)" }}
              aria-label="Back to portal selection"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <img
                src="/assets/generated/a1vs-logo-clean-transparent.dim_400x400.png"
                alt="A1VS"
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div>
                <p
                  className="font-heading font-bold text-sm leading-none"
                  style={{ color: "oklch(0.20 0.05 148)" }}
                >
                  A1VS
                </p>
                <p
                  className="text-[9px] tracking-widest uppercase font-medium leading-tight mt-0.5"
                  style={{ color: "oklch(0.45 0.08 148)" }}
                >
                  Customer Portal
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Logged in — Show navigation cards */}
        {isLoggedIn ? (
          <div
            className="w-full max-w-md space-y-4 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            {/* Welcome card */}
            <Card className="border-0 shadow-xl bg-white/95">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Store className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-heading font-semibold text-sm">
                      Welcome back!
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {currentCompany} · Store #{currentStore}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Link to="/customer/dashboard">
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <LayoutDashboard className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-heading font-semibold text-sm">
                          Go to Dashboard
                        </p>
                        <p className="text-xs text-muted-foreground">
                          View orders, statement & tracking
                        </p>
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
                        <p className="font-heading font-semibold text-sm">
                          Place New Order
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Browse products and place order
                        </p>
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
                        <p className="font-heading font-semibold text-sm">
                          My Orders
                        </p>
                        <p className="text-xs text-muted-foreground">
                          View order history & invoices
                        </p>
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
                        <p className="font-heading font-semibold text-sm">
                          My Statement
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Account statement & PDF download
                        </p>
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
          <div
            className="w-full max-w-md animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            <Card className="w-full shadow-xl border-0 bg-white/95">
              <CardContent className="p-6 space-y-5">
                {!storeInfo ? (
                  <>
                    <div className="flex items-center gap-3 pb-2 border-b border-border">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Store className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-heading font-semibold text-sm">
                          Find Your Store
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enter your store number to continue
                        </p>
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
                          <p className="font-heading font-semibold text-sm text-success">
                            Store Found!
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Confirm your details below
                          </p>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                        <div className="flex gap-3">
                          <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Company
                            </p>
                            <p className="font-semibold text-sm">
                              {storeInfo.companyName}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Address
                            </p>
                            <p className="text-sm">{storeInfo.address}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account On Hold message */}
                    {accountOnHold && (
                      <div
                        className="bg-red-50 border border-red-200 rounded-xl p-4 mb-1"
                        data-ocid="login.account_hold.error_state"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <p className="font-heading font-semibold text-sm text-red-800">
                              Account On Hold
                            </p>
                            <p className="text-xs text-red-700 mt-1 leading-relaxed">
                              Your account is on hold. Please talk to the Admin
                              regarding your customer portal activation.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Connection status for customer portal */}
                    {(isFetching || !actor) && (
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-amber-50 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                        <span className="text-xs text-amber-700">
                          Connecting to service...
                        </span>
                        <Loader2 className="w-3 h-3 animate-spin text-amber-500 ml-auto" />
                      </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your store password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (accountOnHold) setAccountOnHold(false);
                            if (loginFailed) setLoginFailed(false);
                          }}
                          disabled={isLoggingIn}
                          className="h-11"
                          autoFocus
                        />
                      </div>

                      {/* Helper hint after failed login */}
                      {loginFailed && (
                        <div
                          className="rounded-lg px-3 py-2.5 bg-amber-50 border border-amber-200"
                          data-ocid="login.password.error_state"
                        >
                          <p className="text-xs text-amber-700">
                            Login failed. If your account was just created, make
                            sure you are using the exact password set during
                            registration.
                          </p>
                        </div>
                      )}

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
          </div>
        )}

        {/* Admin link */}
        <p className="mt-6 text-xs text-muted-foreground">
          Admin?{" "}
          <a
            href="/admin"
            className="underline hover:text-foreground transition-colors"
          >
            Go to Admin Portal
          </a>
        </p>
      </div>

      {/* Footer */}
      <footer className="relative text-center py-4 text-xs text-muted-foreground">
        © 2026. Built with ♥ using{" "}
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
