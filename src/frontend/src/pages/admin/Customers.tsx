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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Database,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Customer, CustomerInput } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import XLSX from "../../utils/xlsxShim";

function downloadTemplate() {
  const csv =
    "Store Number,Name,Phone,Company Name,Address,GST Number,Email,Password\nSTORE001,John Doe,9999999999,Fresh Mart,123 Main Street Mumbai,,john@freshmart.com,pass123\nSTORE002,Jane Smith,8888888888,Green Grocery,456 Park Avenue Delhi,29ABCDE1234F1Z5,jane@greengrocery.com,pass456";
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "a1vs_customers_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

type EditForm = {
  storeNumber: string;
  name: string;
  phone: string;
  companyName: string;
  address: string;
  gstNumber: string;
  email: string;
  password: string;
};

const emptyForm: EditForm = {
  storeNumber: "",
  name: "",
  phone: "",
  companyName: "",
  address: "",
  gstNumber: "",
  email: "",
  password: "",
};

function customerToForm(c: Customer): EditForm {
  return {
    storeNumber: c.storeNumber,
    name: c.name,
    phone: c.phone,
    companyName: c.companyName,
    address: c.address,
    gstNumber: c.gstNumber ?? "",
    email: c.email,
    password: c.password,
  };
}

function formToCustomerInput(f: EditForm): CustomerInput {
  return {
    storeNumber: f.storeNumber.trim(),
    name: f.name.trim(),
    phone: f.phone.trim(),
    companyName: f.companyName.trim(),
    address: f.address.trim(),
    gstNumber: f.gstNumber.trim() || undefined,
    email: f.email.trim(),
    password: f.password.trim(),
  };
}

export default function Customers() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyForm);
  const [deletingStoreNumber, setDeletingStoreNumber] = useState<string | null>(
    null,
  );
  const [togglingStoreNumber, setTogglingStoreNumber] = useState<string | null>(
    null,
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState<EditForm>(emptyForm);
  const [isAddingSaving, setIsAddingSaving] = useState(false);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["admin-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
  });

  // Toggle customer active/inactive
  const toggleCustomerMutation = useMutation({
    mutationFn: (storeNumber: string) =>
      actor!.toggleCustomerActive(token, storeNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer status updated");
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : "Failed to update customer status";
      toast.error(msg);
    },
    onSettled: () => {
      setTogglingStoreNumber(null);
    },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !actor) return;

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

      const allMapped = rows.map((row, i) => ({
        rowNum: i + 2, // +2 because row 1 is header
        data: {
          storeNumber: String(
            row["Store Number"] ?? row["store number"] ?? row.StoreNumber ?? "",
          ).trim(),
          name: String(row.Name ?? row.name ?? "").trim(),
          phone: String(row.Phone ?? row.phone ?? "").trim(),
          companyName: String(
            row["Company Name"] ?? row["company name"] ?? row.CompanyName ?? "",
          ).trim(),
          address: String(row.Address ?? row.address ?? "").trim(),
          gstNumber: row["GST Number"]
            ? String(row["GST Number"]).trim()
            : undefined,
          email: String(row.Email ?? row.email ?? "").trim(),
          password: String(row.Password ?? row.password ?? "").trim(),
        },
      }));

      // Only Store Number is mandatory — skip rows missing it
      const skippedRows = allMapped
        .filter((r) => !r.data.storeNumber)
        .map((r) => r.rowNum);

      const customerList: CustomerInput[] = allMapped
        .filter((r) => r.data.storeNumber)
        .map((r) => r.data);

      if (customerList.length === 0) {
        toast.error(
          "No valid customers found. Every row must have a Store Number.",
        );
        return;
      }

      if (skippedRows.length > 0) {
        toast.warning(
          `${skippedRows.length} row(s) skipped (missing Store Number): rows ${skippedRows.join(", ")}`,
        );
      }

      // Use addCustomersOnly — does NOT replace existing customers
      await actor.addCustomersOnly(token, customerList);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success(
        `${customerList.length} new customers added (existing records unchanged)`,
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to upload customers";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDownloadCustomerData = () => {
    if (customers.length === 0) {
      toast.error("No customer data to download");
      return;
    }
    const rows = customers.map((c) => ({
      "Store Number": c.storeNumber,
      Name: c.name,
      Phone: c.phone,
      "Company Name": c.companyName,
      Address: c.address,
      "GST Number": c.gstNumber ?? "",
      Email: c.email,
      Password: c.password,
      Status: c.active ? "Active" : "On Hold",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 14 },
      { wch: 25 },
      { wch: 35 },
      { wch: 18 },
      { wch: 30 },
      { wch: 15 },
      { wch: 10 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, "a1vs_customer_data_export.xlsx");
    toast.success(`Downloaded ${customers.length} customer records`);
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm(customerToForm(customer));
  };

  const handleSaveEdit = async () => {
    if (!actor || !editingCustomer) return;
    if (!editForm.storeNumber.trim()) {
      toast.error("Store Number is required.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedInput = formToCustomerInput(editForm);
      await actor.updateCustomer(
        token,
        editingCustomer.storeNumber,
        updatedInput,
      );
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer updated successfully");
      setEditingCustomer(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update customer";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (storeNumber: string) => {
    if (!actor) return;
    setDeletingStoreNumber(storeNumber);
    try {
      await actor.deleteCustomer(token, storeNumber);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer deleted successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete customer";
      toast.error(msg);
    } finally {
      setDeletingStoreNumber(null);
    }
  };

  const handleAddManually = async () => {
    if (!actor) return;
    // Only Store Number is mandatory
    if (!addForm.storeNumber.trim()) {
      toast.error("Store Number is required.");
      return;
    }
    if (customers.some((c) => c.storeNumber === addForm.storeNumber.trim())) {
      toast.error("Store Number already exists.");
      return;
    }
    // Email uniqueness check only if email is provided
    if (
      addForm.email.trim() &&
      customers.some((c) => c.email === addForm.email.trim())
    ) {
      toast.error("Email already exists.");
      return;
    }
    setIsAddingSaving(true);
    try {
      await actor.addCustomer(token, formToCustomerInput(addForm));
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer added successfully");
      setIsAddDialogOpen(false);
      setAddForm(emptyForm);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add customer";
      toast.error(msg);
    } finally {
      setIsAddingSaving(false);
    }
  };

  const formFields: Array<{
    key: keyof EditForm;
    label: string;
    type?: string;
    required?: boolean;
  }> = [
    { key: "storeNumber", label: "Store Number", required: true },
    { key: "name", label: "Name (optional)" },
    { key: "phone", label: "Phone (optional)" },
    { key: "companyName", label: "Company Name (optional)" },
    { key: "address", label: "Address (optional)" },
    { key: "gstNumber", label: "GST Number (optional)" },
    { key: "email", label: "Email (optional)", type: "email" },
    { key: "password", label: "Password (optional)" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage customer stores and login credentials
        </p>
      </div>

      {/* Upload Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Customer Data Management
          </CardTitle>
          <CardDescription>
            Upload new customers via CSV/Excel, download existing data, or add
            customers one at a time.{" "}
            <strong>Store Number is the only mandatory field</strong> — rows
            missing a Store Number are skipped. All other fields are optional.
            Uploading adds NEW customers only — existing records are not
            changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
            data-ocid="customers.template.button"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={isUploading || !actor}
              className="gap-2"
              data-ocid="customers.upload.button"
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setAddForm(emptyForm);
              setIsAddDialogOpen(true);
            }}
            className="gap-2"
            data-ocid="customers.add_manual.button"
          >
            <UserPlus className="w-4 h-4" />
            Add Customer Manually
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadCustomerData}
            disabled={customers.length === 0}
            className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
            data-ocid="customers.download_data.button"
          >
            <Database className="w-4 h-4" />
            Customer Data Download
          </Button>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Customer List
            </CardTitle>
            {!isLoading && (
              <Badge variant="secondary">{customers.length} customers</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {["c1", "c2", "c3", "c4", "c5"].map((k) => (
                <Skeleton key={k} className="h-12 w-full" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div
              className="text-center py-12 text-muted-foreground"
              data-ocid="customers.list.empty_state"
            >
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                No customers yet. Upload a CSV file to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Store #
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Company
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      GST
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer, idx) => (
                    <tr
                      key={customer.storeNumber}
                      className="border-b border-border/50 hover:bg-muted/40 transition-colors"
                      data-ocid={`customers.list.item.${idx + 1}`}
                    >
                      <td className="px-6 py-3 font-mono font-semibold text-primary">
                        {customer.storeNumber}
                      </td>
                      <td className="px-4 py-3 font-medium">{customer.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.companyName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.phone}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {customer.email}
                      </td>
                      <td className="px-4 py-3">
                        {customer.gstNumber ? (
                          <span className="text-xs font-mono">
                            {customer.gstNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </td>
                      {/* Active / On Hold toggle */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <Switch
                            checked={customer.active !== false}
                            onCheckedChange={() => {
                              setTogglingStoreNumber(customer.storeNumber);
                              toggleCustomerMutation.mutate(
                                customer.storeNumber,
                              );
                            }}
                            disabled={
                              togglingStoreNumber === customer.storeNumber
                            }
                            data-ocid="customers.customer.toggle"
                          />
                          <span
                            className={`text-[10px] font-medium ${customer.active !== false ? "text-success" : "text-amber-600"}`}
                          >
                            {customer.active !== false ? "Active" : "On Hold"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => openEdit(customer)}
                            data-ocid="customers.customer.edit_button"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(customer.storeNumber)}
                            disabled={
                              deletingStoreNumber === customer.storeNumber
                            }
                            data-ocid="customers.customer.delete_button"
                          >
                            {deletingStoreNumber === customer.storeNumber ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Customer Manually Dialog */}
      <Dialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setAddForm(emptyForm);
          }
        }}
        data-ocid="customers.add.dialog"
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Add Customer Manually
            </DialogTitle>
            <DialogDescription>
              Only Store Number is required. All other fields are optional and
              can be filled in later via Edit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {formFields.map(({ key, label, type, required }) => (
              <div
                key={key}
                className={key === "address" ? "sm:col-span-2" : ""}
              >
                <Label htmlFor={`add-${key}`} className="text-xs mb-1.5 block">
                  {label}
                  {required && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </Label>
                <Input
                  id={`add-${key}`}
                  type={type ?? "text"}
                  value={addForm[key]}
                  onChange={(e) =>
                    setAddForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder={label}
                  data-ocid={`customers.add.${key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)}_input`}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setAddForm(emptyForm);
              }}
              disabled={isAddingSaving}
              data-ocid="customers.add.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddManually}
              disabled={isAddingSaving || !actor}
              className="gap-2"
              data-ocid="customers.add.submit_button"
            >
              {isAddingSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isAddingSaving ? "Adding..." : "Add Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog
        open={!!editingCustomer}
        onOpenChange={(open) => {
          if (!open) setEditingCustomer(null);
        }}
        data-ocid="customers.edit.dialog"
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer details. Changes will be saved to all portals
              immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {formFields.map(({ key, label, type, required }) => (
              <div
                key={key}
                className={key === "address" ? "sm:col-span-2" : ""}
              >
                <Label htmlFor={`edit-${key}`} className="text-xs mb-1.5 block">
                  {label}
                  {required && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </Label>
                <Input
                  id={`edit-${key}`}
                  type={type ?? "text"}
                  value={editForm[key]}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="h-9 text-sm"
                  placeholder={label}
                  data-ocid={`customers.edit.${key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`)}_input`}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingCustomer(null)}
              disabled={isSaving}
              data-ocid="customers.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="gap-2"
              data-ocid="customers.edit.save_button"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
