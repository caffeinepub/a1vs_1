import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useActor } from "../../hooks/useActor";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [subEmail, setSubEmail] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubLoading, setIsSubLoading] = useState(false);
  const { actor } = useActor();
  const navigate = useNavigate();

  if (localStorage.getItem("a1vs_admin_token")) {
    navigate({ to: "/admin" });
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
    try {
      const token = await actor.adminLogin(email, password);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "masterAdmin");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      toast.error(message);
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
    try {
      const token = await actor.subUserLoginV2(subEmail, subPassword);
      localStorage.setItem("a1vs_admin_token", token);
      localStorage.setItem("a1vs_admin_role", "subUser");
      toast.success("Logged in successfully");
      navigate({ to: "/admin" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid credentials";
      toast.error(message);
    } finally {
      setIsSubLoading(false);
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
              <h1 className="font-heading text-3xl font-bold text-white tracking-tight">A1VS</h1>
              <p className="text-white/70 text-xs tracking-widest uppercase mt-0.5">AONE VEGETABLES & SUPPLIER</p>
            </div>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">Admin Portal</p>
        </div>

        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="font-heading text-xl">Sign In</CardTitle>
            <CardDescription>Access the A1VS management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="master" className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="master" className="flex-1 gap-2 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Master Admin
                </TabsTrigger>
                <TabsTrigger value="subuser" className="flex-1 gap-2 text-xs">
                  <UserCog className="w-3.5 h-3.5" />
                  Sub-User Login
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
                  <Button type="submit" className="w-full h-10 font-medium" disabled={isLoading}>
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
                  <Button type="submit" className="w-full h-10 font-medium" disabled={isSubLoading}>
                    {isSubLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In as Sub-User"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2026. Built with ♥ using{" "}
          <a href="https://caffeine.ai" className="underline hover:text-foreground transition-colors">
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
