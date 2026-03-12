import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ImageIcon,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { CompanyProfile } from "../../backend.d";
import { useExtendedActor } from "../../hooks/useExtendedActor";

export default function AdminProfile() {
  const { actor, isFetching } = useExtendedActor();
  const qc = useQueryClient();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const role = localStorage.getItem("a1vs_admin_role") ?? "masterAdmin";

  // ── Change Password ──────────────────────────────────────────────────────────
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
      const msg =
        err instanceof Error ? err.message : "Failed to change password";
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

  // ── Company Profile ──────────────────────────────────────────────────────────
  const [gstNumber, setGstNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: companyProfile, isLoading: isProfileLoading } =
    useQuery<CompanyProfile>({
      queryKey: ["company-profile"],
      queryFn: () => actor!.getCompanyProfile(),
      enabled: !!actor && !isFetching,
    });

  // Populate form from fetched data
  useEffect(() => {
    if (companyProfile) {
      setGstNumber(companyProfile.gstNumber ?? "");
      setContactPhone(companyProfile.contactPhone ?? "");
      setContactEmail(companyProfile.contactEmail ?? "");
      setAddress(companyProfile.address ?? "");
      setLogoBase64(companyProfile.logoBase64 ?? "");
    }
  }, [companyProfile]);

  const profileMutation = useMutation({
    mutationFn: () =>
      actor!.setCompanyProfile(token, {
        logoBase64,
        gstNumber,
        address,
        contactEmail,
        contactPhone,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      toast.success("Company profile saved successfully");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to save company profile";
      toast.error(msg);
    },
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setLogoBase64(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your admin account settings and company details
        </p>
      </div>

      {/* ── Company Details card ── */}
      <Card className="shadow-xs" data-ocid="profile.company.card">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Company Details
          </CardTitle>
          <CardDescription>
            These details will appear on all invoices, statements, and PDF
            downloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProfileLoading ? (
            <div className="flex items-center gap-2 py-6 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading company profile...
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!actor) {
                  toast.error("Not connected to backend");
                  return;
                }
                profileMutation.mutate();
              }}
              className="space-y-5"
            >
              {/* Logo upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Company Logo</Label>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden shrink-0">
                    {logoBase64 ? (
                      <img
                        src={logoBase64}
                        alt="Company logo"
                        className="w-full h-full object-contain p-1"
                        style={{ background: "transparent" }}
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      data-ocid="profile.logo.upload_button"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2 w-full"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={profileMutation.isPending}
                    >
                      <ImageIcon className="w-4 h-4" />
                      Upload Logo
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Accepted formats: PNG, JPG, JPEG, GIF, WEBP, SVG. The logo
                      will be used in invoices, statements, and payment PDFs.
                    </p>
                    {logoBase64 && (
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline"
                        onClick={() => setLogoBase64("")}
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* GST Number */}
              <div className="space-y-2">
                <Label htmlFor="gst-number" className="text-sm font-medium">
                  GST Number
                </Label>
                <Input
                  id="gst-number"
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  disabled={profileMutation.isPending}
                  data-ocid="profile.gst.input"
                  className="font-mono uppercase"
                />
              </div>

              {/* Company Contact & Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="company-contact"
                    className="text-sm font-medium"
                  >
                    Company Contact (Phone)
                  </Label>
                  <Input
                    id="company-contact"
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    disabled={profileMutation.isPending}
                    data-ocid="profile.contact.input"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="company-email"
                    className="text-sm font-medium"
                  >
                    Company Email
                  </Label>
                  <Input
                    id="company-email"
                    type="email"
                    placeholder="e.g. info@aonevegetables.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    disabled={profileMutation.isPending}
                    data-ocid="profile.email.input"
                  />
                </div>
              </div>

              {/* Company Address */}
              <div className="space-y-2">
                <Label
                  htmlFor="company-address"
                  className="text-sm font-medium"
                >
                  Company Address
                </Label>
                <Textarea
                  id="company-address"
                  placeholder="Full company address (will appear in document footers)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={profileMutation.isPending}
                  className="min-h-20 text-sm resize-none"
                  data-ocid="profile.address.textarea"
                />
                <p className="text-xs text-muted-foreground">
                  This address will appear in the footer of every invoice, PO,
                  and statement.
                </p>
              </div>

              <Button
                type="submit"
                className="gap-2"
                disabled={profileMutation.isPending}
                data-ocid="profile.company.save_button"
              >
                {profileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {profileMutation.isPending
                  ? "Saving..."
                  : "Save Company Profile"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Account Details + Change Password ── */}
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
              <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden">
                {logoBase64 ? (
                  <img
                    src={logoBase64}
                    alt="logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  "A"
                )}
              </div>
              <div>
                <p className="font-heading font-bold text-base">Master Admin</p>
                <p className="text-sm text-muted-foreground">
                  form2.subway@gmail.com
                </p>
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
                <Badge variant="secondary" className="text-xs">
                  AONE VEGETABLES & SUPPLIER
                </Badge>
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
              Update your admin account password. Choose a strong password of at
              least 6 characters.
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
                  data-ocid="profile.new_password.input"
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
                  data-ocid="profile.confirm_password.input"
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">
                    Passwords do not match
                  </p>
                )}
                {confirmPassword &&
                  newPassword === confirmPassword &&
                  confirmPassword.length >= 6 && (
                    <p className="text-xs text-success">Passwords match</p>
                  )}
              </div>
              <Button
                type="submit"
                className="gap-2"
                disabled={passwordMutation.isPending || newPassword.length < 6}
                data-ocid="profile.password.submit_button"
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
