import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, Upload, Users, Loader2, FileSpreadsheet, Pencil, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import type { Customer } from "../../backend.d";

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

function formToCustomer(f: EditForm): Customer {
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
  const [deletingStoreNumber, setDeletingStoreNumber] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["admin-customers", token],
    queryFn: () => actor!.getAllCustomers(token),
    enabled: !!actor && !isFetching && !!token,
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
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const customerList: Customer[] = rows
        .map((row) => ({
          storeNumber: String(row["Store Number"] ?? row["store number"] ?? row["StoreNumber"] ?? "").trim(),
          name: String(row["Name"] ?? row["name"] ?? "").trim(),
          phone: String(row["Phone"] ?? row["phone"] ?? "").trim(),
          companyName: String(row["Company Name"] ?? row["company name"] ?? row["CompanyName"] ?? "").trim(),
          address: String(row["Address"] ?? row["address"] ?? "").trim(),
          gstNumber: row["GST Number"] ? String(row["GST Number"]).trim() : undefined,
          email: String(row["Email"] ?? row["email"] ?? "").trim(),
          password: String(row["Password"] ?? row["password"] ?? "").trim(),
        }))
        .filter((c) => c.storeNumber && c.email && c.password);

      if (customerList.length === 0) {
        toast.error("No valid customers found. Check column headers match the template.");
        return;
      }

      await actor.replaceCustomers(token, customerList);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success(`${customerList.length} customers uploaded successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload customers";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm(customerToForm(customer));
  };

  const handleSaveEdit = async () => {
    if (!actor || !editingCustomer) return;
    if (!editForm.storeNumber.trim() || !editForm.email.trim() || !editForm.password.trim()) {
      toast.error("Store Number, Email, and Password are required.");
      return;
    }
    setIsSaving(true);
    try {
      const updatedCustomer = formToCustomer(editForm);
      const updatedList = customers.map((c) =>
        c.storeNumber === editingCustomer.storeNumber ? updatedCustomer : c
      );
      await actor.replaceCustomers(token, updatedList);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer updated successfully");
      setEditingCustomer(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update customer";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (storeNumber: string) => {
    if (!actor) return;
    setDeletingStoreNumber(storeNumber);
    try {
      const updatedList = customers.filter((c) => c.storeNumber !== storeNumber);
      await actor.replaceCustomers(token, updatedList);
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
      toast.success("Customer deleted successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete customer";
      toast.error(msg);
    } finally {
      setDeletingStoreNumber(null);
    }
  };

  const formFields: Array<{ key: keyof EditForm; label: string; type?: string; required?: boolean }> = [
    { key: "storeNumber", label: "Store Number", required: true },
    { key: "name", label: "Name", required: true },
    { key: "phone", label: "Phone", required: true },
    { key: "companyName", label: "Company Name", required: true },
    { key: "address", label: "Address", required: true },
    { key: "gstNumber", label: "GST Number (optional)" },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "password", label: "Password", required: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Customers</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage customer stores and login credentials</p>
      </div>

      {/* Upload Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Upload Customer Data
          </CardTitle>
          <CardDescription>
            Upload a CSV or Excel file with customer details. Required columns: Store Number, Name, Phone, Company Name, Address, Email, Password.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
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
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
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
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No customers yet. Upload a CSV file to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Store #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">GST</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.storeNumber} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-3 font-mono font-semibold text-primary">{customer.storeNumber}</td>
                      <td className="px-4 py-3 font-medium">{customer.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.companyName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.phone}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{customer.email}</td>
                      <td className="px-4 py-3">
                        {customer.gstNumber ? (
                          <span className="text-xs font-mono">{customer.gstNumber}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => openEdit(customer)}
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleDelete(customer.storeNumber)}
                            disabled={deletingStoreNumber === customer.storeNumber}
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

      {/* Edit Customer Dialog */}
      <Dialog open={!!editingCustomer} onOpenChange={(open) => { if (!open) setEditingCustomer(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Customer</DialogTitle>
            <DialogDescription>
              Update customer details. Changes will be saved to all portals immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {formFields.map(({ key, label, type, required }) => (
              <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                <Label htmlFor={`edit-${key}`} className="text-xs mb-1.5 block">
                  {label}{required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                <Input
                  id={`edit-${key}`}
                  type={type ?? "text"}
                  value={editForm[key]}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setEditingCustomer(null)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="gap-2"
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
