import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Link2, Lock, Save } from "lucide-react";

export default function Settings() {
  const { actor } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";

  const [webhookUrl, setWebhookUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const webhookMutation = useMutation({
    mutationFn: () => actor!.setWebhookUrl(token, webhookUrl),
    onSuccess: () => toast.success("Webhook URL saved successfully"),
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save webhook URL";
      toast.error(msg);
    },
  });

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

  const handleWebhookSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      toast.error("Please enter a webhook URL");
      return;
    }
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    webhookMutation.mutate();
  };

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
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Configure integrations and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Google Sheets Webhook */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Google Sheets Integration
            </CardTitle>
            <CardDescription>
              Configure a Google Apps Script webhook URL to sync orders to Google Sheets automatically when an order is placed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleWebhookSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  placeholder="https://script.google.com/macros/s/..."
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  disabled={webhookMutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Deploy a Google Apps Script as a web app and paste the URL here.
                </p>
              </div>
              <Button
                type="submit"
                className="gap-2"
                disabled={webhookMutation.isPending}
              >
                {webhookMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {webhookMutation.isPending ? "Saving..." : "Save Webhook URL"}
              </Button>
            </form>

            <Separator className="my-6" />

            <div className="space-y-3">
              <p className="text-sm font-medium">How to set up Google Sheets sync:</p>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Open Google Sheets and go to Extensions → Apps Script</li>
                <li>Create a doPost(e) function to receive order data</li>
                <li>Deploy as a web app (access: anyone)</li>
                <li>Copy the deployment URL and paste it above</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Admin Password
            </CardTitle>
            <CardDescription>
              Update the main admin account password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordMutation.isPending}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="gap-2"
                disabled={passwordMutation.isPending}
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
