import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCircle, Lock, ShieldCheck, Loader2 } from "lucide-react";

export default function AdminProfile() {
  const { actor } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const role = localStorage.getItem("a1vs_admin_role") ?? "masterAdmin";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const passwordMutation = useMutation({
    mutationFn: () => actor!.changeAdminPassword(token, newPassword),
    onSuccess: () => {
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast.error(msg);
    },
  });

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    passwordMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your admin account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <UserCircle className="w-4 h-4 text-primary" />
              Account Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-muted/40 rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                A
              </div>
              <div>
                <p className="font-heading font-bold text-base">Master Admin</p>
                <p className="text-sm text-muted-foreground">form2.subway@gmail.com</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm">form2.subway@gmail.com</p>
                </div>
              </div>
              <div className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <Badge className="bg-primary/15 text-primary border-0">
                      {role === "masterAdmin" ? "Master Admin" : "Sub-User"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Portal</p>
                  <p className="font-medium text-sm">A1VS Admin Portal</p>
                </div>
                <Badge variant="secondary" className="text-xs">AONE VEGETABLES & SUPPLIER</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your admin account password. Choose a strong password of at least 6 characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordMutation.isPending}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
                {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 6 && (
                  <p className="text-xs text-success">Passwords match</p>
                )}
              </div>
              <Button
                type="submit"
                className="gap-2"
                disabled={passwordMutation.isPending || newPassword.length < 6}
              >
                {passwordMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {passwordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
