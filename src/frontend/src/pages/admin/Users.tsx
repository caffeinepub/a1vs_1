import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { UserPlus, Loader2, UserCog, ShieldCheck, Briefcase, Calculator, KeyRound } from "lucide-react";
import type { SubUser } from "../../backend.d";

const roles = [
  {
    value: "storeManager",
    label: "Store Manager",
    icon: Briefcase,
    desc: "Manages delivery status and order approval",
  },
  {
    value: "accountTeam",
    label: "Account Team",
    icon: Calculator,
    desc: "Manages accounts, statements and payments",
  },
  {
    value: "purchaseManager",
    label: "Purchase Manager",
    icon: ShieldCheck,
    desc: "View statements and reports",
  },
];

function getRoleLabel(roleText: string) {
  return roles.find((r) => r.value === roleText)?.label ?? roleText;
}

export default function Users() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("storeManager");

  const [changePwdUser, setChangePwdUser] = useState<SubUser | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const { data: subUsers = [], isLoading } = useQuery<SubUser[]>({
    queryKey: ["sub-users", token],
    queryFn: () => actor!.getAllSubUsers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const createMutation = useMutation({
    mutationFn: () => actor!.createSubUserWithPassword(token, email, password, role),
    onSuccess: () => {
      toast.success(`Sub-user ${email} created`);
      setEmail("");
      setPassword("");
      setRole("storeManager");
      qc.invalidateQueries({ queryKey: ["sub-users"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (userEmail: string) => actor!.toggleSubUser(token, userEmail),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-users"] });
      toast.success("User status updated");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user");
    },
  });

  const changePwdMutation = useMutation({
    mutationFn: ({ userEmail, pwd }: { userEmail: string; pwd: string }) =>
      actor!.changeSubUserPassword(token, userEmail, pwd),
    onSuccess: () => {
      toast.success("Password updated");
      setChangePwdUser(null);
      setNewPwd("");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">Create and manage admin portal team accounts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Sub-User Form */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Create Team Account
            </CardTitle>
            <CardDescription>
              Create accounts for Store Manager, Account Team, or Purchase Manager with their own email/password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-email">Email Address</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="manager@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-password">Password</Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>Role / Position</Label>
                <Select value={role} onValueChange={setRole} disabled={createMutation.isPending}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roles.find((r) => r.value === role)?.desc}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {createMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Role Info Cards */}
        <div className="space-y-3">
          <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Available Positions
          </h2>
          {roles.map(({ value, label, icon: Icon, desc }) => (
            <Card
              key={value}
              className={`shadow-xs cursor-pointer transition-all ${
                role === value ? "ring-2 ring-primary" : "hover:bg-muted/40"
              }`}
              onClick={() => setRole(value)}
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    role === value ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-sm">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <UserCog
                  className={`w-4 h-4 ml-auto ${role === value ? "text-primary" : "text-muted-foreground/30"}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Existing Sub-Users */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <UserCog className="w-4 h-4 text-primary" />
            Team Accounts
            {!isLoading && <Badge variant="secondary">{subUsers.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : subUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No team accounts yet. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {subUsers.map((user) => (
                <div
                  key={user.email}
                  className="flex items-center gap-3 border border-border rounded-xl p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{user.email}</p>
                    <p className="text-xs text-muted-foreground">{getRoleLabel(user.roleText)}</p>
                  </div>
                  <Badge
                    className={
                      user.active
                        ? "bg-success/15 text-success border-0 text-xs"
                        : "bg-muted text-muted-foreground border-0 text-xs"
                    }
                  >
                    {user.active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={user.active}
                    onCheckedChange={() => toggleMutation.mutate(user.email)}
                    disabled={toggleMutation.isPending}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs gap-1.5"
                    onClick={() => {
                      setChangePwdUser(user);
                      setNewPwd("");
                    }}
                  >
                    <KeyRound className="w-3 h-3" />
                    Password
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      <Dialog open={!!changePwdUser} onOpenChange={(open) => !open && setChangePwdUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Change Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Changing password for: <strong>{changePwdUser?.email}</strong>
            </p>
            <div className="space-y-2">
              <Label htmlFor="new-pwd">New Password</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="Min. 6 characters"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setChangePwdUser(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={changePwdMutation.isPending || newPwd.length < 6}
                onClick={() => {
                  if (changePwdUser) {
                    changePwdMutation.mutate({ userEmail: changePwdUser.email, pwd: newPwd });
                  }
                }}
              >
                {changePwdMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
