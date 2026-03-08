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
import { ArrowLeft, Loader2, ShieldCheck, Truck, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useExtendedActor } from "../../hooks/useExtendedActor";
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
  const { actor } = useExtendedActor();
  const navigate = useNavigate();

  // Do NOT auto-redirect based on a stored token — tokens are invalidated on every new deployment.
  // The user must log in again to get a fresh session from the backend.

  const attemptMasterLogin = async (retries = 3): Promise<void> => {
    if (!actor) return;
    try {
      const token = await actor.adminLogin(email, password);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "masterAdmin");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptMasterLogin(retries - 1);
      }
      const message = getFriendlyErrorMessage(
        err,
        "Invalid credentials. Please check your email and password.",
      );
      toast.error(message);
    }
  };

  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again in a moment");
      return;
    }
    setIsLoading(true);
    try {
      await attemptMasterLogin();
    } finally {
      setIsLoading(false);
    }
  };

  const attemptSubUserLogin = async (retries = 3): Promise<void> => {
    if (!actor) return;
    try {
      // Use the subUserLogin function that exists in the backend
      const token = await actor.subUserLogin(subEmail, subPassword);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "subUser");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptSubUserLogin(retries - 1);
      }
      const message = getFriendlyErrorMessage(
        err,
        "Invalid credentials. Please check your email and password.",
      );
      toast.error(message);
    }
  };

  const handleSubUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subEmail || !subPassword) {
      toast.error("Please enter email and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again in a moment");
      return;
    }
    setIsSubLoading(true);
    try {
      await attemptSubUserLogin();
    } finally {
      setIsSubLoading(false);
    }
  };

  const attemptRiderLogin = async (retries = 3): Promise<void> => {
    if (!actor) return;
    try {
      // Use the subUserLogin function that exists in the backend
      // For riders, phone number is the email/login ID stored in backend
      const token = await actor.subUserLogin(riderEmail, riderPassword);
      localStorage.setItem("a1vs_rider_token", token);
      localStorage.setItem("a1vs_rider_email", riderEmail);
      localStorage.setItem("a1vs_rider_name", riderEmail); // phone as fallback name
      localStorage.setItem("a1vs_rider_phone", riderEmail);
      localStorage.setItem("a1vs_rider_role", "rider");
      toast.success("Welcome, Rider! Loading your dashboard...");
      navigate({ to: "/rider" });
    } catch (err: unknown) {
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptRiderLogin(retries - 1);
      }
      const message = getFriendlyErrorMessage(
        err,
        "Invalid credentials. Please check your phone number and password.",
      );
      toast.error(message);
    }
  };

  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderEmail || !riderPassword) {
      toast.error("Please enter email and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again in a moment");
      return;
    }
    setIsRiderLoading(true);
    try {
      await attemptRiderLogin();
    } finally {
      setIsRiderLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.18 0.08 148) 0%, oklch(0.12 0.06 148) 100%)",
      }}
    >
      {/* Animated floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "380px",
            height: "380px",
            top: "-60px",
            left: "-80px",
            background: "oklch(0.55 0.18 148 / 0.07)",
            animationDelay: "0s",
            animationDuration: "9s",
          }}
        />
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "260px",
            height: "260px",
            bottom: "40px",
            right: "-40px",
            background: "oklch(0.65 0.2 148 / 0.08)",
            animationDelay: "3s",
            animationDuration: "7s",
          }}
        />
        <div
          className="animate-float-bubble absolute rounded-full"
          style={{
            width: "160px",
            height: "160px",
            top: "45%",
            right: "20%",
            background: "oklch(0.50 0.15 148 / 0.05)",
            animationDelay: "1.5s",
            animationDuration: "8s",
          }}
        />
      </div>

      <div className="relative w-full max-w-md px-4 animate-slide-up">
        {/* Back button */}
        <button
          type="button"
          data-ocid="admin.login.back.button"
          onClick={() => navigate({ to: "/splash" })}
          className="flex items-center gap-1.5 text-white/50 hover:text-white/90 transition-colors text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <div
              style={{
                filter:
                  "drop-shadow(0 0 32px oklch(0.65 0.2 148 / 0.5)) drop-shadow(0 4px 16px rgba(0,0,0,0.3))",
              }}
            >
              <img
                src="/assets/generated/a1vs-logo-clean-transparent.dim_400x400.png"
                alt="A1VS Logo"
                className="h-20 w-20 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold text-white tracking-tight">
                A1VS
              </h1>
              <p className="text-white/70 text-xs tracking-widest uppercase mt-0.5">
                AONE VEGETABLES &amp; SUPPLIER
              </p>
            </div>
          </div>
          <p className="text-white/50 mt-3 text-sm">Admin Portal</p>
        </div>

        <Card
          className="border border-white/10 shadow-2xl backdrop-blur-md"
          style={{ background: "oklch(0.18 0.04 148 / 0.85)" }}
        >
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="font-heading text-xl text-white">
              Sign In
            </CardTitle>
            <CardDescription className="text-white/50">
              Access the A1VS management dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="master" className="w-full">
              <TabsList
                className="w-full mb-4 grid grid-cols-3"
                style={{ background: "oklch(0.25 0.06 148 / 0.6)" }}
              >
                <TabsTrigger
                  value="master"
                  className="gap-1.5 text-xs text-white/70 data-[state=active]:text-white"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </TabsTrigger>
                <TabsTrigger
                  value="subuser"
                  className="gap-1.5 text-xs text-white/70 data-[state=active]:text-white"
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="rider"
                  className="gap-1.5 text-xs text-white/70 data-[state=active]:text-white"
                  data-ocid="admin.login.rider.tab"
                >
                  <Truck className="w-3.5 h-3.5" />
                  Rider
                </TabsTrigger>
              </TabsList>

              <TabsContent value="master">
                <form onSubmit={handleMasterLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white/80 text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="form2.subway@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white/80 text-sm">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm bg-white text-emerald-900 hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                    <Label
                      htmlFor="sub-email"
                      className="text-white/80 text-sm"
                    >
                      Email
                    </Label>
                    <Input
                      id="sub-email"
                      type="email"
                      placeholder="manager@company.com"
                      value={subEmail}
                      onChange={(e) => setSubEmail(e.target.value)}
                      disabled={isSubLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="sub-password"
                      className="text-white/80 text-sm"
                    >
                      Password
                    </Label>
                    <Input
                      id="sub-password"
                      type="password"
                      placeholder="••••••••"
                      value={subPassword}
                      onChange={(e) => setSubPassword(e.target.value)}
                      disabled={isSubLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm bg-white text-emerald-900 hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                  <div
                    className="rounded-lg px-3 py-2 mb-1"
                    style={{ background: "oklch(0.38 0.14 264 / 0.3)" }}
                  >
                    <p className="text-xs text-indigo-200">
                      Rider login — enter your phone number as login ID
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="rider-email"
                      className="text-white/80 text-sm"
                    >
                      Phone Number (Login ID)
                    </Label>
                    <Input
                      id="rider-email"
                      type="tel"
                      placeholder="+91 9999999999"
                      value={riderEmail}
                      onChange={(e) => setRiderEmail(e.target.value)}
                      disabled={isRiderLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.rider.phone.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="rider-password"
                      className="text-white/80 text-sm"
                    >
                      Password
                    </Label>
                    <Input
                      id="rider-password"
                      type="password"
                      placeholder="••••••••"
                      value={riderPassword}
                      onChange={(e) => setRiderPassword(e.target.value)}
                      disabled={isRiderLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.rider.password.input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm bg-indigo-500 hover:bg-indigo-400 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
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

        <p className="text-center text-xs text-white/30 mt-6">
          © 2026. Built with ♥ using{" "}
          <a
            href="https://caffeine.ai"
            className="underline hover:text-white/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
