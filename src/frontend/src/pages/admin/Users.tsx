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
  Pencil,
  Phone,
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

// Rider profiles are now stored in the backend -- no localStorage needed

export default function Users() {
  const { actor, isFetching } = useExtendedActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();

  // Fetch rider profiles from backend (graceful degradation if function missing)
  const { data: riderProfilesArr = [] } = useReactQuery<RiderProfile[]>({
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
  // For riders, phone IS the login ID (no separate email)

  const [changePwdUser, setChangePwdUser] = useState<SubUser | null>(null);
  const [newPwd, setNewPwd] = useState("");

  // Edit sub-user state
  const [editUser, setEditUser] = useState<SubUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editNewPwd, setEditNewPwd] = useState("");

  const { data: subUsers = [], isLoading } = useQuery<SubUser[]>({
    queryKey: ["sub-users", token],
    queryFn: async () => {
      try {
        return await actor!.getAllSubUsers(token);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!token,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (role === "rider") {
        // For riders: phone number is login ID, passed as email param
        const phoneAsEmail = email.trim();
        try {
          await actor!.createSubUserWithPassword(
            token,
            phoneAsEmail,
            password,
            role,
          );
        } catch {
          // Fall back to basic createSubUser if extended version not available
          await actor!.createSubUser(
            token,
            phoneAsEmail,
            "manager" as import("../../backend.d").UserRole,
          );
        }
        try {
          if (riderName.trim()) {
            await actor!.saveRiderProfile(
              token,
              phoneAsEmail,
              riderName.trim(),
              phoneAsEmail, // phone = login ID
            );
          }
        } catch {
          // Rider profile save not available, ignore
        }
      } else {
        try {
          await actor!.createSubUserWithPassword(token, email, password, role);
        } catch {
          // Fall back to basic createSubUser
          await actor!.createSubUser(
            token,
            email,
            "manager" as import("../../backend.d").UserRole,
          );
        }
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
      qc.invalidateQueries({ queryKey: ["sub-users"] });
      qc.invalidateQueries({ queryKey: ["rider-profiles"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create user";
      toast.error(msg);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (userEmail: string) => {
      try {
        await actor!.toggleSubUser(token, userEmail);
      } catch {
        throw new Error("Toggle user feature not yet available");
      }
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
      try {
        await actor!.changeSubUserPassword(token, userEmail, pwd);
      } catch {
        throw new Error("Change password feature not yet available");
      }
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

  // Edit mutation: update rider profile (name/phone) + optionally change password
  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const userEmail = editUser.email;

      // If role is rider, update rider profile with new name and phone
      if (editUser.roleText === "rider" || editRole === "rider") {
        try {
          await actor!.saveRiderProfile(
            token,
            userEmail,
            editName.trim() || userEmail,
            editPhone.trim() || userEmail,
          );
        } catch {
          // saveRiderProfile not available, skip silently
        }
      } else {
        // For non-rider: save name/designation/phone to localStorage per-user
        if (editName.trim()) {
          localStorage.setItem(`a1vs_user_name_${userEmail}`, editName.trim());
        }
        if (editDesignation.trim()) {
          localStorage.setItem(
            `a1vs_user_designation_${userEmail}`,
            editDesignation.trim(),
          );
        }
        if (editPhone.trim()) {
          localStorage.setItem(
            `a1vs_user_phone_${userEmail}`,
            editPhone.trim(),
          );
        }
      }

      // If new password entered, update it
      if (editNewPwd.trim().length >= 6) {
        try {
          await actor!.changeSubUserPassword(
            token,
            userEmail,
            editNewPwd.trim(),
          );
        } catch {
          // changeSubUserPassword not available, skip silently
        }
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
      setEditName(localStorage.getItem(`a1vs_user_name_${user.email}`) ?? "");
      setEditDesignation(
        localStorage.getItem(`a1vs_user_designation_${user.email}`) ??
          getRoleLabel(user.roleText),
      );
      setEditPhone(localStorage.getItem(`a1vs_user_phone_${user.email}`) ?? "");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error(
        role === "rider"
          ? "Please enter phone number and password"
          : "Please enter email and password",
      );
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
              Create accounts for Store Manager, Account Team, Purchase Manager,
              or Rider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-email">
                  {role === "rider"
                    ? "Phone Number (Login ID)"
                    : "Email Address"}
                </Label>
                <Input
                  id="user-email"
                  type={role === "rider" ? "tel" : "email"}
                  placeholder={
                    role === "rider" ? "+91 9999999999" : "manager@company.com"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={createMutation.isPending}
                  data-ocid="admin.users.email.input"
                />
                {role === "rider" && (
                  <p className="text-xs text-indigo-600">
                    Phone number will be used as the rider's login ID
                  </p>
                )}
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
                  data-ocid="admin.users.password.input"
                />
              </div>
              <div className="space-y-2">
                <Label>Role / Position</Label>
                <Select
                  value={role}
                  onValueChange={setRole}
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
                  <p className="text-xs text-indigo-500">
                    Phone number entered above is used as both login ID and
                    contact number.
                  </p>
                </div>
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
                const savedName =
                  user.roleText !== "rider"
                    ? localStorage.getItem(`a1vs_user_name_${user.email}`)
                    : null;
                const savedDesignation =
                  user.roleText !== "rider"
                    ? localStorage.getItem(
                        `a1vs_user_designation_${user.email}`,
                      )
                    : null;
                const savedPhone =
                  user.roleText !== "rider"
                    ? localStorage.getItem(`a1vs_user_phone_${user.email}`)
                    : null;

                return (
                  <div
                    key={user.email}
                    className={`flex items-center gap-3 border rounded-xl p-3 ${user.roleText === "rider" ? "border-indigo-100 bg-indigo-50/30" : "border-border"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {user.roleText === "rider"
                            ? riderProfile?.name
                              ? `${riderProfile.name}`
                              : user.email
                            : (savedName ?? user.email)}
                        </p>
                        {user.roleText === "rider" && (
                          <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[10px] px-1.5">
                            <Truck className="w-2.5 h-2.5 mr-1" />
                            Rider
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {savedDesignation ?? getRoleLabel(user.roleText)}
                      </p>
                      {/* Show login ID / contact */}
                      {user.roleText === "rider" ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <a
                            href={`tel:${user.email}`}
                            className="text-xs text-indigo-500 flex items-center gap-0.5"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            {user.email}
                          </a>
                        </div>
                      ) : savedPhone ? (
                        <a
                          href={`tel:${savedPhone}`}
                          className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5"
                        >
                          <Phone className="w-2.5 h-2.5" />
                          {savedPhone}
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
                    {/* Edit button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1.5 text-primary hover:bg-primary/10"
                      onClick={() => openEditUser(user)}
                      data-ocid="admin.users.edit_button"
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
                      data-ocid="admin.users.password.button"
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
            {/* Email (read-only) */}
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

            {/* Name */}
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

            {/* Designation (non-rider only) */}
            {editUser?.roleText !== "rider" && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-designation">Designation / Position</Label>
                <Input
                  id="edit-designation"
                  type="text"
                  placeholder="e.g. Store Manager"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  disabled={editMutation.isPending}
                  data-ocid="admin.users.edit_designation.input"
                />
              </div>
            )}

            {/* Phone */}
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

            {/* Role (read-only display) */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role</Label>
              <div className="px-3 py-2 bg-muted/40 rounded-lg border border-border">
                <p className="text-sm">
                  {getRoleLabel(editUser?.roleText ?? "")}
                </p>
              </div>
            </div>

            {/* Optional new password */}
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
