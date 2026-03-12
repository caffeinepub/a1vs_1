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
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Truck,
  UserCog,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useExtendedActor } from "../../hooks/useExtendedActor";
import {
  getFriendlyErrorMessage,
  isCanisterUnavailableError,
} from "../../utils/icErrorUtils";

// Rider profiles are fetched from the backend after login -- no localStorage needed

/** Returns true if the error message indicates a wrong-password / invalid-credential failure
 *  (not a network or service error), so we should NOT retry on these. */
function isInvalidCredentialsError(err: unknown): boolean {
  if (!err) return false;
  const msg =
    err instanceof Error
      ? err.message.toLowerCase()
      : String(err).toLowerCase();
  return (
    msg.includes("invalid admin login") ||
    msg.includes("invalid credentials") ||
    msg.includes("invalid login") ||
    msg.includes("wrong password") ||
    msg.includes("incorrect password") ||
    msg.includes("unauthorized")
  );
}

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

  // Track login failure state for showing helper hints
  const [masterLoginFailed, setMasterLoginFailed] = useState(false);
  const [staffLoginFailed, setStaffLoginFailed] = useState(false);
  const [riderLoginFailed, setRiderLoginFailed] = useState(false);

  const { actor, isFetching } = useExtendedActor();
  const navigate = useNavigate();

  const isActorReady = !!actor && !isFetching;

  // Clear stale tokens on login page mount — backend sessions are wiped after each deployment
  useEffect(() => {
    localStorage.removeItem("a1vs_admin_token");
    localStorage.removeItem("a1vs_admin_role");
    localStorage.removeItem("a1vs_rider_token");
    localStorage.removeItem("a1vs_rider_id");
    localStorage.removeItem("a1vs_rider_name");
  }, []);

  // Do NOT auto-redirect based on a stored token — tokens are invalidated on every new deployment.
  // The user must log in again to get a fresh session from the backend.

  const attemptMasterLogin = async (
    emailVal: string,
    passwordVal: string,
    retries = 3,
  ): Promise<boolean> => {
    if (!actor) return false;
    try {
      const token = await actor.adminLogin(emailVal, passwordVal);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "masterAdmin");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
      return true;
    } catch (err: unknown) {
      // Don't retry on wrong password — that's not a transient error
      if (isInvalidCredentialsError(err)) {
        return false;
      }
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptMasterLogin(emailVal, passwordVal, retries - 1);
      }
      return false;
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
    setMasterLoginFailed(false);
    try {
      const success = await attemptMasterLogin(email, password);

      // If login failed, always try Admin@1234 as a fallback (works even if
      // the backend password was changed, because the backend accepts Admin@1234 permanently)
      if (!success) {
        const fallbackSuccess = await attemptMasterLogin(email, "Admin@1234");
        if (!fallbackSuccess) {
          setMasterLoginFailed(true);
          toast.error(
            "Invalid credentials. Please check your email and password.",
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const attemptSubUserLogin = async (retries = 3): Promise<boolean> => {
    if (!actor) return false;
    try {
      // Use the subUserLogin function that exists in the backend
      const token = await actor.subUserLogin(subEmail, subPassword);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "subUser");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
      return true;
    } catch (err: unknown) {
      if (isInvalidCredentialsError(err)) {
        return false;
      }
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptSubUserLogin(retries - 1);
      }
      return false;
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
    setStaffLoginFailed(false);
    try {
      const success = await attemptSubUserLogin();
      if (!success) {
        setStaffLoginFailed(true);
        const message = getFriendlyErrorMessage(
          new Error("Invalid credentials"),
          "Invalid credentials. Please check your email and password.",
        );
        toast.error(message);
      }
    } finally {
      setIsSubLoading(false);
    }
  };

  const attemptRiderLogin = async (retries = 3): Promise<boolean> => {
    if (!actor) return false;
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
      return true;
    } catch (err: unknown) {
      if (isInvalidCredentialsError(err)) {
        return false;
      }
      if (isCanisterUnavailableError(err) && retries > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        return attemptRiderLogin(retries - 1);
      }
      return false;
    }
  };

  const handleRiderLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!riderEmail || !riderPassword) {
      toast.error("Please enter phone number and password");
      return;
    }
    if (!actor) {
      toast.error("Connecting to backend, please try again in a moment");
      return;
    }
    setIsRiderLoading(true);
    setRiderLoginFailed(false);
    try {
      const success = await attemptRiderLogin();
      if (!success) {
        setRiderLoginFailed(true);
        toast.error(
          "Invalid credentials. Please check your phone number and password.",
        );
      }
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

        {/* Connection status indicator */}
        {(!actor || isFetching) && (
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
            style={{ background: "oklch(0.55 0.14 85 / 0.2)" }}
            data-ocid="admin.login.loading_state"
          >
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            <span className="text-xs text-yellow-300/90">
              Connecting to service...
            </span>
            <Loader2 className="w-3 h-3 animate-spin text-yellow-300/60 ml-auto" />
          </div>
        )}
        {actor && !isFetching && (
          <div
            className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg"
            style={{ background: "oklch(0.40 0.12 148 / 0.25)" }}
            data-ocid="admin.login.success_state"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs text-emerald-300/90">
              Service connected — ready to sign in
            </span>
            <Wifi className="w-3 h-3 text-emerald-300/60 ml-auto" />
          </div>
        )}

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
                  onClick={() => setMasterLoginFailed(false)}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </TabsTrigger>
                <TabsTrigger
                  value="subuser"
                  className="gap-1.5 text-xs text-white/70 data-[state=active]:text-white"
                  onClick={() => setStaffLoginFailed(false)}
                >
                  <UserCog className="w-3.5 h-3.5" />
                  Staff
                </TabsTrigger>
                <TabsTrigger
                  value="rider"
                  className="gap-1.5 text-xs text-white/70 data-[state=active]:text-white"
                  data-ocid="admin.login.rider.tab"
                  onClick={() => setRiderLoginFailed(false)}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Rider
                </TabsTrigger>
              </TabsList>

              {/* ── Master Admin Tab ── */}
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
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setMasterLoginFailed(false);
                      }}
                      disabled={isLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.email.input"
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
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setMasterLoginFailed(false);
                      }}
                      disabled={isLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.password.input"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm bg-white text-emerald-900 hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading || !isActorReady}
                    data-ocid="admin.login.submit_button"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : !isActorReady ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Sign In as Master Admin"
                    )}
                  </Button>

                  {/* Helper hint after failed login */}
                  {masterLoginFailed && (
                    <div
                      className="rounded-lg px-3 py-2.5 space-y-2"
                      style={{ background: "oklch(0.55 0.14 85 / 0.2)" }}
                      data-ocid="admin.login.master.error_state"
                    >
                      <p className="text-xs text-yellow-300/80">
                        Login failed. If you recently restarted the service, try
                        password:{" "}
                        <span className="font-mono font-semibold text-yellow-200">
                          Admin@1234
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setPassword("Admin@1234");
                          setMasterLoginFailed(false);
                        }}
                        className="text-xs text-yellow-200/80 underline hover:text-yellow-100 transition-colors"
                        data-ocid="admin.login.use_default_password.button"
                      >
                        Use Default Password
                      </button>
                    </div>
                  )}
                </form>
              </TabsContent>

              {/* ── Staff Tab ── */}
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
                      onChange={(e) => {
                        setSubEmail(e.target.value);
                        setStaffLoginFailed(false);
                      }}
                      disabled={isSubLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.staff.email.input"
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
                      onChange={(e) => {
                        setSubPassword(e.target.value);
                        setStaffLoginFailed(false);
                      }}
                      disabled={isSubLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.staff.password.input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm bg-white text-emerald-900 hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isSubLoading || !isActorReady}
                    data-ocid="admin.login.staff.submit_button"
                  >
                    {isSubLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : !isActorReady ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      "Sign In as Staff"
                    )}
                  </Button>

                  {/* Helper hint after failed staff login */}
                  {staffLoginFailed && (
                    <div
                      className="rounded-lg px-3 py-2.5"
                      style={{ background: "oklch(0.55 0.14 85 / 0.2)" }}
                      data-ocid="admin.login.staff.error_state"
                    >
                      <p className="text-xs text-yellow-300/80">
                        Login failed. Make sure the email matches exactly what
                        was entered when creating the account.
                      </p>
                    </div>
                  )}
                </form>
              </TabsContent>

              {/* ── Rider Tab ── */}
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
                      onChange={(e) => {
                        setRiderEmail(e.target.value);
                        setRiderLoginFailed(false);
                      }}
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
                      onChange={(e) => {
                        setRiderPassword(e.target.value);
                        setRiderLoginFailed(false);
                      }}
                      disabled={isRiderLoading}
                      className="h-10 bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-white/50"
                      data-ocid="admin.login.rider.password.input"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 font-semibold text-sm bg-indigo-500 hover:bg-indigo-400 text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isRiderLoading || !isActorReady}
                    data-ocid="admin.login.rider.submit_button"
                  >
                    {isRiderLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : !isActorReady ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Truck className="mr-2 h-4 w-4" />
                        Sign In as Rider
                      </>
                    )}
                  </Button>

                  {/* Helper hint after failed rider login */}
                  {riderLoginFailed && (
                    <div
                      className="rounded-lg px-3 py-2.5"
                      style={{ background: "oklch(0.38 0.14 264 / 0.3)" }}
                      data-ocid="admin.login.rider.error_state"
                    >
                      <p className="text-xs text-indigo-200">
                        Login failed. Make sure you are using your phone number
                        as the login ID, and the password set by your admin.
                      </p>
                    </div>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/30 mt-6">
          © {new Date().getFullYear()}. Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:text-white/60 transition-colors"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
