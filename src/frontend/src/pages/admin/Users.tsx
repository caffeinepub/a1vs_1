import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useQuery as useReactQuery,
} from "@tanstack/react-query";
import {
  Briefcase,
  Calculator,
  KeyRound,
  Loader2,
  Phone,
  ShieldCheck,
  Truck,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { RiderProfile, SubUser } from "../../backend.d";
import { useActor } from "../../hooks/useActor";

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
  {
    value: "rider",
    label: "Rider / Delivery",
    icon: Truck,
    desc: "Handles deliveries, updates order status from field",
  },
];

function getRoleLabel(roleText: string) {
  return roles.find((r) => r.value === roleText)?.label ?? roleText;
}

// Rider profiles are now stored in the backend -- no localStorage needed

export default function Users() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();

  // Fetch rider profiles from backend
  const { data: riderProfilesArr = [] } = useReactQuery<RiderProfile[]>({
    queryKey: ["rider-profiles", token],
    queryFn: () => actor!.getAllRiderProfiles(token),
    enabled: !!actor && !isFetching && !!token,
  });
  const riderProfilesMap: Record<string, { name: string; phone: string }> = {};
  for (const rp of riderProfilesArr) {
    riderProfilesMap[rp.email] = { name: rp.name, phone: rp.phone };
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("storeManager");
  const [riderName, setRiderName] = useState("");
  const [riderPhone, setRiderPhone] = useState("");

  const [changePwdUser, setChangePwdUser] = useState<SubUser | null>(null);
  const [newPwd, setNewPwd] = useState("");

  const { data: subUsers = [], isLoading } = useQuery<SubUser[]>({
    queryKey: ["sub-users", token],
    queryFn: () => actor!.getAllSubUsers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await actor!.createSubUserWithPassword(token, email, password, role);
      // Save rider profile to backend so it's visible across all devices
      if (role === "rider" && riderName.trim()) {
        await actor!.saveRiderProfile(
          token,
          email,
          riderName.trim(),
          riderPhone.trim(),
        );
      }
    },
    onSuccess: () => {
      toast.success(
        `${role === "rider" ? "Rider" : "Sub-user"} ${email} created`,
      );
      setEmail("");
      setPassword("");
      setRole("storeManager");
      setRiderName("");
      setRiderPhone("");
      qc.invalidateQueries({ queryKey: ["sub-users"] });
      qc.invalidateQueries({ queryKey: ["rider-profiles"] });
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
      toast.error(
        err instanceof Error ? err.message : "Failed to change password",
      );
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
    if (role === "rider" && !riderName.trim()) {
      toast.error("Please enter a name for the rider");
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
        <p className="text-muted-foreground text-sm mt-1">
          Create and manage admin portal team accounts
        </p>
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
              Create accounts for Store Manager, Account Team, or Purchase
              Manager with their own email/password.
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
                <Select
                  value={role}
                  onValueChange={setRole}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roles.find((r) => r.value === role)?.desc}
                </p>
              </div>

              {/* Rider-specific fields */}
              {role === "rider" && (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    Rider Details
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="rider-name" className="text-xs">
                      Rider Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="rider-name"
                      type="text"
                      placeholder="Full name of rider"
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.rider_name.input"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rider-phone" className="text-xs">
                      Rider Phone
                    </Label>
                    <Input
                      id="rider-phone"
                      type="tel"
                      placeholder="+91 9999999999"
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.rider_phone.input"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className={`w-full gap-2 ${role === "rider" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
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
                    role === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-heading font-semibold text-sm">
                    {label}
                  </div>
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
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : subUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No team accounts yet. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {subUsers.map((user) => {
                const riderProfile =
                  user.roleText === "rider"
                    ? riderProfilesMap[user.email]
                    : null;
                return (
                  <div
                    key={user.email}
                    className={`flex items-center gap-3 border rounded-xl p-3 ${user.roleText === "rider" ? "border-indigo-100 bg-indigo-50/30" : "border-border"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {user.email}
                        </p>
                        {user.roleText === "rider" && (
                          <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-1.5">
                            <Truck className="w-2.5 h-2.5 mr-1" />
                            Rider
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getRoleLabel(user.roleText)}
                      </p>
                      {riderProfile && (
                        <div className="flex items-center gap-2 mt-0.5">
                          {riderProfile.name && (
                            <span className="text-xs text-indigo-600 font-medium">
                              {riderProfile.name}
                            </span>
                          )}
                          {riderProfile.phone && (
                            <a
                              href={`tel:${riderProfile.phone}`}
                              className="text-xs text-indigo-500 flex items-center gap-0.5"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              {riderProfile.phone}
                            </a>
                          )}
                        </div>
                      )}
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Modal */}
      <Dialog
        open={!!changePwdUser}
        onOpenChange={(open) => !open && setChangePwdUser(null)}
      >
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
              <Button
                variant="outline"
                onClick={() => setChangePwdUser(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={changePwdMutation.isPending || newPwd.length < 6}
                onClick={() => {
                  if (changePwdUser) {
                    changePwdMutation.mutate({
                      userEmail: changePwdUser.email,
                      pwd: newPwd,
                    });
                  }
                }}
              >
                {changePwdMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
