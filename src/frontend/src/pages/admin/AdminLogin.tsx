import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCog,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useActor } from "../../hooks/useActor";
import {
  getFriendlyErrorMessage,
  isCanisterUnavailableError,
} from "../../utils/icErrorUtils";

// Rider profiles are fetched from the backend after login -- no localStorage needed

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [riderEmail, setRiderEmail] = useState("");
  const [riderPassword, setRiderPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const [isRiderLoading, setIsRiderLoading] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const { actor } = useActor();
  const navigate = useNavigate();

  if (localStorage.getItem("a1vs_admin_token")) {
    navigate({ to: "/admin" });
    return null;
  }
  if (localStorage.getItem("a1vs_rider_token")) {
    navigate({ to: "/rider" });
    return null;
  }

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again");
      return;
    }

    setIsLoading(true);
    setServiceError(null);
    try {
      const token = await actor.adminLogin(email, password);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "masterAdmin");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err)) {
        setServiceError(
          "Service is temporarily unavailable. Please try again in a moment.",
        );
      } else {
        const message = getFriendlyErrorMessage(err, "Invalid credentials");
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail || !subPassword) {
      toast.error("Please enter email and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again");
      return;
    }

    setIsSubLoading(true);
    setServiceError(null);
    try {
      const token = await actor.subUserLoginV2(subEmail, subPassword);
      // Check if sub-user is actually a rider
      try {
        const allUsers = await actor.getAllSubUsers(token);
        const found = allUsers.find(
          (u) => u.email.toLowerCase() === subEmail.toLowerCase(),
        );
        if (found?.roleText === "rider") {
          // Fetch rider profile from backend
          let riderName = subEmail;
          let riderPhone = "";
          try {
            const profile = await actor.getRiderProfile(token, subEmail);
            if (profile) {
              riderName = profile.name || subEmail;
              riderPhone = profile.phone || "";
            }
          } catch {
            // fall back to email
          }
          localStorage.setItem("a1vs_rider_token", token);
          localStorage.setItem("a1vs_rider_email", subEmail);
          localStorage.setItem("a1vs_rider_name", riderName);
          localStorage.setItem("a1vs_rider_phone", riderPhone);
          localStorage.setItem("a1vs_rider_role", "rider");
          toast.success("Welcome, Rider! Loading your dashboard...");
          navigate({ to: "/rider" });
          return;
        }
      } catch {
        // If we can't check role, fall through to admin
      }
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "subUser");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err)) {
        setServiceError(
          "Service is temporarily unavailable. Please try again in a moment.",
        );
      } else {
        const message = getFriendlyErrorMessage(err, "Invalid credentials");
        toast.error(message);
      }
    } finally {
      setIsSubLoading(false);
    }
  };

  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderEmail || !riderPassword) {
      toast.error("Please enter email and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again");
      return;
    }

    setIsRiderLoading(true);
    setServiceError(null);
    try {
      const token = await actor.subUserLoginV2(riderEmail, riderPassword);
      // Verify this user is a rider
      const allUsers = await actor.getAllSubUsers(token);
      const found = allUsers.find(
        (u) => u.email.toLowerCase() === riderEmail.toLowerCase(),
      );
      if (!found || found.roleText !== "rider") {
        toast.error("This account is not a Rider account. Use Sub-User login.");
        return;
      }
      // Fetch rider profile from backend
      let riderName = riderEmail;
      let riderPhone = "";
      try {
        const profile = await actor.getRiderProfile(token, riderEmail);
        if (profile) {
          riderName = profile.name || riderEmail;
          riderPhone = profile.phone || "";
        }
      } catch {
        // If profile fetch fails, fall back to email
      }
      localStorage.setItem("a1vs_rider_token", token);
      localStorage.setItem("a1vs_rider_email", riderEmail);
      localStorage.setItem("a1vs_rider_name", riderName);
      localStorage.setItem("a1vs_rider_phone", riderPhone);
      localStorage.setItem("a1vs_rider_role", "rider");
      toast.success("Welcome, Rider! Loading your dashboard...");
      navigate({ to: "/rider" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err)) {
        setServiceError(
          "Service is temporarily unavailable. Please try again in a moment.",
        );
      } else {
        const message = getFriendlyErrorMessage(err, "Invalid credentials");
        toast.error(message);
      }
    } finally {
      setIsRiderLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center admin-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, oklch(0.65 0.16 148) 0%, transparent 50%), radial-gradient(circle at 80% 70%, oklch(0.55 0.12 240) 0%, transparent 50%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-md px-4 animate-slide-up">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <img
              src="/assets/uploads/A-One-Vegetables-LOGO-1.png"
              alt="A1VS Logo"
              className="h-20 w-20 object-contain drop-shadow-lg"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="font-heading text-3xl font-bold text-white tracking-tight">
                A1VS
              </h1>
              <p className="text-white/70 text-xs tracking-widest uppercase mt-0.5">
                AONE VEGETABLES & SUPPLIER
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">Admin Portal</p>
        </div>

        {/* Service unavailable banner */}
        {serviceError && (
          <Alert
            variant="destructive"
            className="mb-4 bg-amber-50 border-amber-300 text-amber-900"
            data-ocid="admin.login.error_state"
          >
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between gap-3">
              <span className="text-sm">{serviceError}</span>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-amber-400 text-amber-800 hover:bg-amber-100 h-7 px-2 text-xs gap-1"
                onClick={() => {
                  setServiceError(null);
                  window.location.reload();
                }}
                data-ocid="admin.login.error_state.button"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="font-heading text-xl">Sign In</CardTitle>
            <CardDescription>
              Access the A1VS management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="master" className="w-full">
              <TabsList className="w-full mb-4 grid grid-cols-3">
                <TabsTrigger value="master" className="gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </TabsTrigger>
                <TabsTrigger value="subuser" className="gap-1.5 text-xs">
                  <UserCog className="w-3.5 h-3.5" />
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="rider"
                  className="gap-1.5 text-xs"
                  data-ocid="admin.login.rider.tab"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Rider
                </TabsTrigger>
              </TabsList>

              <TabsContent value="master">
                <form onSubmit={handleMasterLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="form2.subway@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 font-medium"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In as Master Admin"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="subuser">
                <form onSubmit={handleSubUserLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sub-email">Email</Label>
                    <Input
                      id="sub-email"
                      type="email"
                      placeholder="manager@company.com"
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      disabled={isSubLoading}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-password">Password</Label>
                    <Input
                      id="sub-password"
                      type="password"
                      placeholder="••••••••"
                      value={subPassword}
                      onChange={(e) => setSubPassword(e.target.value)}
                      disabled={isSubLoading}
                      className="h-10"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 font-medium"
                    disabled={isSubLoading}
                  >
                    {isSubLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In as Staff"
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="rider">
                <form onSubmit={handleRiderLogin} className="space-y-4">
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 mb-1">
                    <p className="text-xs text-indigo-700">
                      Rider login — for delivery personnel only
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rider-email">Email</Label>
                    <Input
                      id="rider-email"
                      type="email"
                      placeholder="rider@company.com"
                      value={riderEmail}
                      onChange={(e) => setRiderEmail(e.target.value)}
                      disabled={isRiderLoading}
                      className="h-10"
                      data-ocid="admin.login.rider.email.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rider-password">Password</Label>
                    <Input
                      id="rider-password"
                      type="password"
                      placeholder="••••••••"
                      value={riderPassword}
                      onChange={(e) => setRiderPassword(e.target.value)}
                      disabled={isRiderLoading}
                      className="h-10"
                      data-ocid="admin.login.rider.password.input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-10 font-medium bg-indigo-600 hover:bg-indigo-700"
                    disabled={isRiderLoading}
                    data-ocid="admin.login.rider.submit_button"
                  >
                    {isRiderLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Sign In as Rider
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026. Built with ♥ using{" "}
          <a
            href="https://caffeine.ai"
            className="underline hover:text-foreground transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
