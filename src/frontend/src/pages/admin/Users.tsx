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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Briefcase,
  Calculator,
  KeyRound,
  Loader2,
  Pencil,
  Phone,
  RefreshCw,
  ShieldCheck,
  Truck,
  UserCog,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useExtendedActor } from "../../hooks/useExtendedActor";
import type { RiderProfile, SubUser } from "../../types/appTypes";

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

export default function Users() {
  const { actor, isFetching } = useExtendedActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();

  // Fetch rider profiles from backend
  const { data: riderProfilesArr = [] } = useQuery<RiderProfile[]>({
    queryKey: ["rider-profiles", token],
    queryFn: async () => {
      try {
        return await actor!.getAllRiderProfiles(token);
      } catch {
        return [];
      }
    },
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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [changePwdUser, setChangePwdUser] = useState<SubUser | null>(null);
  const [newPwd, setNewPwd] = useState("");

  // Edit sub-user state
  const [editUser, setEditUser] = useState<SubUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [_editRole, setEditRole] = useState("");
  const [editNewPwd, setEditNewPwd] = useState("");

  // Fetch all sub-users -- errors are surfaced, not swallowed
  const {
    data: subUsers = [],
    isLoading,
    isError,
    error: fetchError,
    refetch: refetchUsers,
  } = useQuery<SubUser[]>({
    queryKey: ["sub-users", token],
    queryFn: async () => {
      const result = await actor!.getAllSubUsers(token);
      return result;
    },
    enabled: !!actor && !isFetching && !!token,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (role === "rider") {
        // Riders: phone number is the login ID
        const phoneAsEmail = email.trim();
        // NOTE: No fallback to createSubUser -- that saves to wrong map
        await actor!.createSubUserWithPassword(
          token,
          phoneAsEmail,
          password,
          role,
          riderName.trim() || phoneAsEmail,
          phoneAsEmail,
        );
        // Also save rider profile with name and phone
        try {
          await actor!.saveRiderProfile(
            token,
            phoneAsEmail,
            riderName.trim() || phoneAsEmail,
            phoneAsEmail,
          );
        } catch {
          // Non-fatal: profile is also saved inside createSubUserWithPassword
        }
      } else {
        // Non-rider: use email + name + phone
        await actor!.createSubUserWithPassword(
          token,
          email.trim(),
          password,
          role,
          name.trim() || email.trim(),
          phone.trim(),
        );
      }
    },
    onSuccess: () => {
      const label = role === "rider" ? "Rider" : getRoleLabel(role);
      toast.success(`${label} account created successfully`);
      setEmail("");
      setPassword("");
      setRole("storeManager");
      setRiderName("");
      setName("");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["sub-users"] });
      qc.invalidateQueries({ queryKey: ["rider-profiles"] });
    },
    onError: (err: unknown) => {
      const raw = err instanceof Error ? err.message : String(err);
      // Surface meaningful error messages
      if (raw.includes("already exists")) {
        toast.error("An account with this email/phone already exists.");
      } else if (
        raw.includes("session") ||
        raw.includes("Invalid") ||
        raw.includes("expired")
      ) {
        toast.error("Session expired. Please log out and log in again.");
      } else {
        toast.error(`Failed to create account: ${raw}`);
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      await actor!.toggleSubUser(token, userEmail);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sub-users"] });
      toast.success("User status updated");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to toggle user");
    },
  });

  const changePwdMutation = useMutation({
    mutationFn: async ({
      userEmail,
      pwd,
    }: { userEmail: string; pwd: string }) => {
      await actor!.changeSubUserPassword(token, userEmail, pwd);
    },
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

  // Edit mutation: save name/phone/designation to backend via riderProfile for all roles
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const userEmail = editUser.email;

      // Save name/phone for all roles via saveRiderProfile (it stores for any user key)
      try {
        await actor!.saveRiderProfile(
          token,
          userEmail,
          editName.trim() || userEmail,
          editPhone.trim() || "",
        );
      } catch {
        // Silently ignore if not available
      }

      // Also mirror to localStorage for non-rider display
      if (editUser.roleText !== "rider") {
        if (editName.trim())
          localStorage.setItem(`a1vs_user_name_${userEmail}`, editName.trim());
        if (editDesignation.trim())
          localStorage.setItem(
            `a1vs_user_designation_${userEmail}`,
            editDesignation.trim(),
          );
        if (editPhone.trim())
          localStorage.setItem(
            `a1vs_user_phone_${userEmail}`,
            editPhone.trim(),
          );
      }

      // Update password if provided
      if (editNewPwd.trim().length >= 6) {
        await actor!.changeSubUserPassword(token, userEmail, editNewPwd.trim());
      }
    },
    onSuccess: () => {
      toast.success("Account updated successfully");
      setEditUser(null);
      setEditName("");
      setEditDesignation("");
      setEditPhone("");
      setEditRole("");
      setEditNewPwd("");
      qc.invalidateQueries({ queryKey: ["sub-users"] });
      qc.invalidateQueries({ queryKey: ["rider-profiles"] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to update account",
      );
    },
  });

  const openEditUser = (user: SubUser) => {
    setEditUser(user);
    setEditRole(user.roleText);
    setEditNewPwd("");

    if (user.roleText === "rider") {
      const rp = riderProfilesMap[user.email];
      setEditName(rp?.name ?? "");
      setEditPhone(rp?.phone ?? user.email);
      setEditDesignation("Rider / Delivery");
    } else {
      const rp = riderProfilesMap[user.email];
      setEditName(
        rp?.name ?? localStorage.getItem(`a1vs_user_name_${user.email}`) ?? "",
      );
      setEditDesignation(
        localStorage.getItem(`a1vs_user_designation_${user.email}`) ??
          getRoleLabel(user.roleText),
      );
      setEditPhone(
        rp?.phone ??
          localStorage.getItem(`a1vs_user_phone_${user.email}`) ??
          "",
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "rider") {
      if (!email.trim() || !password.trim()) {
        toast.error("Please enter phone number and password");
        return;
      }
      if (!riderName.trim()) {
        toast.error("Please enter a name for the rider");
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        toast.error("Please enter email and password");
        return;
      }
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
              Create accounts for Store Manager, Account Team, Purchase Manager,
              or Rider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-role">Role / Position</Label>
                <Select
                  value={role}
                  onValueChange={(v) => {
                    setRole(v);
                    setEmail("");
                    setName("");
                    setPhone("");
                    setRiderName("");
                  }}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger data-ocid="admin.users.role.select">
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

              {role === "rider" ? (
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
                    <Label htmlFor="user-email" className="text-xs">
                      Phone Number (Login ID){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="user-email"
                      type="tel"
                      placeholder="+91 9999999999"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.email.input"
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-indigo-500">
                      Phone number is used as the rider's login ID.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password" className="text-xs">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="user-password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.password.input"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="user-fullname">Full Name</Label>
                    <Input
                      id="user-fullname"
                      type="text"
                      placeholder="Full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.name.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-email">
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="user-email"
                      type="email"
                      placeholder="manager@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.email.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-phone">Phone Number</Label>
                    <Input
                      id="user-phone"
                      type="tel"
                      placeholder="+91 9999999999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.phone.input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-password">
                      Password <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="user-password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={createMutation.isPending}
                      data-ocid="admin.users.password.input"
                    />
                  </div>
                </>
              )}

              <Button
                type="submit"
                className={`w-full gap-2 ${role === "rider" ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                disabled={createMutation.isPending}
                data-ocid="admin.users.create.submit_button"
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
            {!isLoading && !isError && (
              <Badge variant="secondary">{subUsers.length}</Badge>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs gap-1"
              onClick={() => refetchUsers()}
              disabled={isLoading}
              data-ocid="admin.users.refresh.button"
            >
              <RefreshCw
                className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div
              className="text-center py-8 text-muted-foreground text-sm flex items-center justify-center gap-2"
              data-ocid="admin.users.loading_state"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading team accounts...
            </div>
          ) : isError ? (
            <div
              className="text-center py-8 space-y-3"
              data-ocid="admin.users.error_state"
            >
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <p className="text-sm text-destructive font-medium">
                Failed to load team accounts
              </p>
              <p className="text-xs text-muted-foreground">
                {fetchError instanceof Error
                  ? fetchError.message
                  : "Session may have expired. Please log out and log in again."}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchUsers()}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </Button>
            </div>
          ) : subUsers.length === 0 ? (
            <div
              className="text-center py-8 text-muted-foreground text-sm"
              data-ocid="admin.users.empty_state"
            >
              No team accounts yet. Create one above.
            </div>
          ) : (
            <div className="space-y-2">
              {subUsers.map((user, idx) => {
                const riderProfile = riderProfilesMap[user.email];
                const displayName =
                  riderProfile?.name ||
                  localStorage.getItem(`a1vs_user_name_${user.email}`) ||
                  user.email;
                const displayDesignation =
                  localStorage.getItem(`a1vs_user_designation_${user.email}`) ||
                  getRoleLabel(user.roleText);
                const displayPhone =
                  riderProfile?.phone ||
                  localStorage.getItem(`a1vs_user_phone_${user.email}`) ||
                  "";

                return (
                  <div
                    key={user.email}
                    data-ocid={`admin.users.item.${idx + 1}`}
                    className={`flex items-center gap-3 border rounded-xl p-3 ${
                      user.roleText === "rider"
                        ? "border-indigo-100 bg-indigo-50/30"
                        : "border-border"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {displayName}
                        </p>
                        {user.roleText === "rider" && (
                          <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-1.5">
                            <Truck className="w-2.5 h-2.5 mr-1" />
                            Rider
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {displayDesignation}
                      </p>
                      {displayPhone ? (
                        <a
                          href={`tel:${displayPhone}`}
                          className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          {displayPhone}
                        </a>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {user.email}
                        </p>
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
                      className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10"
                      onClick={() => openEditUser(user)}
                      data-ocid={`admin.users.edit_button.${idx + 1}`}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1.5"
                      onClick={() => {
                        setChangePwdUser(user);
                        setNewPwd("");
                      }}
                      data-ocid={`admin.users.password.button.${idx + 1}`}
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
        <DialogContent
          className="max-w-sm"
          data-ocid="admin.users.password.dialog"
        >
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
                data-ocid="admin.users.new_password.input"
              />
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setChangePwdUser(null)}
                className="flex-1"
                data-ocid="admin.users.password.cancel_button"
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
                data-ocid="admin.users.password.confirm_button"
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

      {/* Edit Sub-User Modal */}
      <Dialog
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      >
        <DialogContent className="max-w-md" data-ocid="admin.users.edit.dialog">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Login ID{" "}
                <span className="text-muted-foreground/60">
                  (cannot change)
                </span>
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg border border-border">
                <p className="text-sm font-mono text-muted-foreground flex-1">
                  {editUser?.email}
                </p>
                {editUser?.roleText === "rider" && (
                  <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px]">
                    <Phone className="w-2.5 h-2.5 mr-1" />
                    Phone Login
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">
                {editUser?.roleText === "rider" ? "Rider Name" : "Full Name"}
              </Label>
              <Input
                id="edit-name"
                type="text"
                placeholder="Full name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editMutation.isPending}
                data-ocid="admin.users.edit_name.input"
              />
            </div>

            {editUser?.roleText !== "rider" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-designation">Designation / Position</Label>
                <Input
                  id="edit-designation"
                  type="text"
                  placeholder="e.g. Account Manager"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  disabled={editMutation.isPending}
                  data-ocid="admin.users.edit_designation.input"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">
                {editUser?.roleText === "rider"
                  ? "Contact / Phone Number"
                  : "Contact Phone"}
              </Label>
              <Input
                id="edit-phone"
                type="tel"
                placeholder="+91 9999999999"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                disabled={editMutation.isPending}
                data-ocid="admin.users.edit_phone.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div className="px-3 py-2 bg-muted/40 rounded-lg border border-border">
                <p className="text-sm">
                  {getRoleLabel(editUser?.roleText ?? "")}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-new-pwd">
                New Password{" "}
                <span className="text-muted-foreground/60 text-xs">
                  (leave blank to keep current)
                </span>
              </Label>
              <Input
                id="edit-new-pwd"
                type="password"
                placeholder="Min. 6 characters"
                value={editNewPwd}
                onChange={(e) => setEditNewPwd(e.target.value)}
                disabled={editMutation.isPending}
                data-ocid="admin.users.edit_new_password.input"
              />
              {editNewPwd.length > 0 && editNewPwd.length < 6 && (
                <p className="text-xs text-destructive">
                  Password must be at least 6 characters
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                onClick={() => setEditUser(null)}
                className="flex-1"
                disabled={editMutation.isPending}
                data-ocid="admin.users.edit.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={
                  editMutation.isPending ||
                  (editNewPwd.length > 0 && editNewPwd.length < 6)
                }
                onClick={() => editMutation.mutate()}
                data-ocid="admin.users.edit.save_button"
              >
                {editMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Pencil className="w-4 h-4" />
                )}
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
