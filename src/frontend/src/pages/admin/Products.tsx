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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Download,
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Product, ProductInput } from "../../backend.d";
import { useActor } from "../../hooks/useActor";
import XLSX from "../../utils/xlsxShim";

export default function Products() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";

  const [search, setSearch] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const imageUploadRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Add/Edit form state
  const [formName, setFormName] = useState("");
  const [formUnit, setFormUnit] = useState("KGS");
  const [formRate, setFormRate] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formImage, setFormImage] = useState("");
  const [formImagePreview, setFormImagePreview] = useState("");

  // ── Fetch all products ──────────────────────────────────────────────
  const {
    data: products = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Product[]>({
    queryKey: ["allProducts", token],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getAllProducts(token);
      } catch {
        // fallback to public endpoint
        try {
          return await actor.getAllProductsPublic();
        } catch {
          return [];
        }
      }
    },
    enabled: !!actor,
    staleTime: 0,
    refetchOnMount: true,
  });

  // ── Add single product ─────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (input: ProductInput) => {
      if (!actor) throw new Error("Not connected");
      await actor.replaceProductsWithDetails(token, [
        ...products.map((p) => ({
          name: p.name,
          unit: p.unit,
          rate: p.rate,
          imageBase64: p.imageBase64 || undefined,
        })),
        input,
      ]);
      // Immediately fetch back to confirm save
      const fresh = await actor
        .getAllProducts(token)
        .catch(() => actor.getAllProductsPublic());
      return fresh;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(["allProducts", token], fresh);
      toast.success("Product added successfully");
      setShowAddDialog(false);
      resetForm();
    },
    onError: () => toast.error("Failed to add product"),
  });

  // ── Edit product ───────────────────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: async (input: ProductInput & { id: bigint }) => {
      if (!actor) throw new Error("Not connected");
      const updated = products.map((p) =>
        p.id === input.id
          ? {
              name: input.name,
              unit: input.unit,
              rate: input.rate,
              imageBase64: input.imageBase64 || p.imageBase64 || undefined,
            }
          : {
              name: p.name,
              unit: p.unit,
              rate: p.rate,
              imageBase64: p.imageBase64 || undefined,
            },
      );
      await actor.replaceProductsWithDetails(token, updated);
      const fresh = await actor
        .getAllProducts(token)
        .catch(() => actor.getAllProductsPublic());
      return fresh;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(["allProducts", token], fresh);
      toast.success("Product updated");
      setEditProduct(null);
      resetForm();
    },
    onError: () => toast.error("Failed to update product"),
  });

  // ── Toggle active ──────────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async (productId: bigint) => {
      if (!actor) throw new Error("Not connected");
      await actor.toggleProduct(token, productId);
      const fresh = await actor
        .getAllProducts(token)
        .catch(() => actor.getAllProductsPublic());
      return fresh;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(["allProducts", token], fresh);
    },
    onError: () => toast.error("Failed to toggle product"),
  });

  // ── Activate / Deactivate ALL ──────────────────────────────────────
  const toggleAllMutation = useMutation({
    mutationFn: async (active: boolean) => {
      if (!actor) throw new Error("Not connected");
      await actor.setAllProductsActive(token, active);
      const fresh = await actor
        .getAllProducts(token)
        .catch(() => actor.getAllProductsPublic());
      return fresh;
    },
    onSuccess: (fresh, active) => {
      queryClient.setQueryData(["allProducts", token], fresh);
      toast.success(
        active ? "All products activated" : "All products deactivated",
      );
    },
    onError: () => toast.error("Failed to update all products"),
  });

  // ── Per-product image upload ───────────────────────────────────────
  const imgMutation = useMutation({
    mutationFn: async ({
      productId,
      imageBase64,
    }: { productId: bigint; imageBase64: string }) => {
      if (!actor) throw new Error("Not connected");
      await actor.updateProductImage(token, productId, imageBase64);
      const fresh = await actor
        .getAllProducts(token)
        .catch(() => actor.getAllProductsPublic());
      return fresh;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(["allProducts", token], fresh);
      toast.success("Image updated");
    },
    onError: () => toast.error("Failed to upload image"),
  });

  // ── Bulk upload ────────────────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: async (inputs: ProductInput[]) => {
      if (!actor) throw new Error("Not connected");
      // Merge: if name matches existing product, update it; else add new
      const existingMap: Record<string, Product> = {};
      for (const p of products) existingMap[p.name.toLowerCase().trim()] = p;

      const merged: ProductInput[] = [
        // Start with all existing products
        ...products.map((p) => ({
          name: p.name,
          unit: p.unit,
          rate: p.rate,
          imageBase64: p.imageBase64 || undefined,
        })),
      ];

      for (const input of inputs) {
        const key = input.name.toLowerCase().trim();
        const idx = merged.findIndex(
          (m) => m.name.toLowerCase().trim() === key,
        );
        if (idx >= 0) {
          // Update existing
          merged[idx] = {
            ...merged[idx],
            ...input,
            imageBase64: merged[idx].imageBase64,
          };
        } else {
          // Add new
          merged.push(input);
        }
      }

      await actor.replaceProductsWithDetails(token, merged);
      const fresh = await actor
        .getAllProducts(token)
        .catch(() => actor.getAllProductsPublic());
      return { fresh, addedCount: inputs.length };
    },
    onSuccess: ({ fresh, addedCount }) => {
      queryClient.setQueryData(["allProducts", token], fresh);
      toast.success(
        `Bulk upload complete: ${addedCount} products processed, ${fresh.length} total`,
      );
    },
    onError: () => toast.error("Bulk upload failed"),
  });

  // ── Helpers ────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormName("");
    setFormUnit("KGS");
    setFormRate("");
    setFormActive(true);
    setFormImage("");
    setFormImagePreview("");
  };

  const openAddDialog = () => {
    resetForm();
    setEditProduct(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (p: Product) => {
    setEditProduct(p);
    setFormName(p.name);
    setFormUnit(p.unit);
    setFormRate(String(p.rate));
    setFormActive(p.active);
    setFormImage(p.imageBase64 || "");
    setFormImagePreview(
      p.imageBase64 ? `data:image/jpeg;base64,${p.imageBase64}` : "",
    );
    setShowAddDialog(true);
  };

  const handleFormImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      setFormImage(base64);
      setFormImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFormSubmit = () => {
    if (!formName.trim()) {
      toast.error("Product name is required");
      return;
    }
    const rate = Number.parseFloat(formRate);
    if (Number.isNaN(rate) || rate < 0) {
      toast.error("Enter a valid rate");
      return;
    }

    if (editProduct) {
      editMutation.mutate({
        id: editProduct.id,
        name: formName.trim(),
        unit: formUnit,
        rate,
        imageBase64: formImage || undefined,
      });
    } else {
      addMutation.mutate({
        name: formName.trim(),
        unit: formUnit,
        rate,
        imageBase64: formImage || undefined,
      });
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const wb = XLSX.read(buffer, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws);

        const parsed: ProductInput[] = [];
        for (const row of rows) {
          const name = String(row.Name || row.name || "").trim();
          if (!name) continue;
          const unit = String(row.Unit || row.unit || "KGS")
            .trim()
            .toUpperCase();
          const rate = Number.parseFloat(String(row.Rate || row.rate || "0"));
          parsed.push({
            name,
            unit: unit || "KGS",
            rate: Number.isNaN(rate) ? 0 : rate,
          });
        }

        if (parsed.length === 0) {
          toast.error("No valid products found in file");
          return;
        }
        bulkMutation.mutate(parsed);
      } catch {
        toast.error("Failed to read file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleDownloadAll = () => {
    if (products.length === 0) {
      toast.error("No products to download");
      return;
    }
    const rows = products.map((p) => ({
      Name: p.name,
      Unit: p.unit,
      Rate: p.rate,
      Status: p.active ? "Active" : "Inactive",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "A1VS_Products.xlsx");
    toast.success("Products downloaded");
  };

  const handleProductImageUpload = (productId: bigint, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] || "";
      imgMutation.mutate({ productId, imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  // ── Filter by search ───────────────────────────────────────────────
  const searchTerms = search
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const filtered = searchTerms.length
    ? products.filter((p) =>
        searchTerms.some((t) => p.name.toLowerCase().includes(t)),
      )
    : products;

  const activeCount = products.filter((p) => p.active).length;

  return (
    <div className="space-y-6" data-ocid="products.section">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">
            Products
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length} total &bull; {activeCount} active
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Add New Product */}
          <Button
            onClick={openAddDialog}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            data-ocid="products.add.open_modal_button"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>

          {/* Upload Bulk */}
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => uploadRef.current?.click()}
            disabled={bulkMutation.isPending}
            data-ocid="products.bulk.upload_button"
          >
            {bulkMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload Bulk Products
          </Button>
          <input
            ref={uploadRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleBulkUpload}
          />

          {/* Download All */}
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleDownloadAll}
            data-ocid="products.download.button"
          >
            <Download className="w-4 h-4" />
            Download All Products
          </Button>
        </div>
      </div>

      {/* Master toggle + search */}
      <Card className="border-gray-200">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search products (comma-separated for multiple)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
                data-ocid="products.search.input"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Master toggles */}
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                onClick={() => toggleAllMutation.mutate(true)}
                disabled={toggleAllMutation.isPending}
                data-ocid="products.activate_all.button"
              >
                Activate All
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-9 border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => toggleAllMutation.mutate(false)}
                disabled={toggleAllMutation.isPending}
                data-ocid="products.deactivate_all.button"
              >
                Deactivate All
              </Button>
            </div>
          </div>

          {searchTerms.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Showing {filtered.length} of {products.length} products
            </p>
          )}
        </CardContent>
      </Card>

      {/* Product list */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-gray-900">
            Product Catalog
          </CardTitle>
          <CardDescription className="text-sm">
            Manage individual products, rates, images and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3" data-ocid="products.loading_state">
              {Array.from({ length: 8 }).map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-10" data-ocid="products.error_state">
              <p className="text-red-500 text-sm mb-3">
                Failed to load products
              </p>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="text-center py-16 text-gray-400"
              data-ocid="products.empty_state"
            >
              <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
              {products.length === 0 ? (
                <>
                  <p className="font-medium text-gray-600 mb-1">
                    No products yet
                  </p>
                  <p className="text-sm mb-4">
                    Click "Add New Product" to add your first product, or use
                    "Upload Bulk Products" to upload many at once.
                  </p>
                  <Button
                    onClick={openAddDialog}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Product
                  </Button>
                </>
              ) : (
                <p className="text-sm">No products match your search</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((product, idx) => (
                <ProductRow
                  key={String(product.id)}
                  product={product}
                  idx={idx}
                  onToggle={() => toggleMutation.mutate(product.id)}
                  onEdit={() => openEditDialog(product)}
                  onImageUpload={(file) =>
                    handleProductImageUpload(product.id, file)
                  }
                  imageUploadRefs={imageUploadRefs}
                  isToggling={toggleMutation.isPending}
                  isUploadingImage={imgMutation.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditProduct(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Image preview */}
            {formImagePreview && (
              <div className="flex justify-center">
                <img
                  src={formImagePreview}
                  alt="preview"
                  className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Product Name *</Label>
              <Input
                placeholder="e.g. Tomato"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                data-ocid="products.form.name.input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Select value={formUnit} onValueChange={setFormUnit}>
                  <SelectTrigger data-ocid="products.form.unit.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KGS">KGS</SelectItem>
                    <SelectItem value="EACH">EACH</SelectItem>
                    <SelectItem value="PCS">PCS</SelectItem>
                    <SelectItem value="BOX">BOX</SelectItem>
                    <SelectItem value="BUNCH">BUNCH</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Rate (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  data-ocid="products.form.rate.input"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={formActive}
                onCheckedChange={setFormActive}
                data-ocid="products.form.active.switch"
              />
              <Label>{formActive ? "Active" : "Inactive"}</Label>
            </div>

            <div className="space-y-1.5">
              <Label>Image (optional)</Label>
              <label
                htmlFor="form-image-upload"
                className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                data-ocid="products.form.image.upload_button"
              >
                <Camera className="w-4 h-4" />
                {formImagePreview ? "Change image" : "Upload image"}
              </label>
              <input
                id="form-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFormImageChange}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddDialog(false);
                  setEditProduct(null);
                  resetForm();
                }}
                data-ocid="products.form.cancel.button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleFormSubmit}
                disabled={addMutation.isPending || editMutation.isPending}
                data-ocid="products.form.save.button"
              >
                {addMutation.isPending || editMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...
                  </>
                ) : editProduct ? (
                  "Save Changes"
                ) : (
                  "Add Product"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Product Row Component ─────────────────────────────────────────────────────
interface ProductRowProps {
  product: Product;
  idx: number;
  onToggle: () => void;
  onEdit: () => void;
  onImageUpload: (file: File) => void;
  imageUploadRefs: React.MutableRefObject<
    Record<string, HTMLInputElement | null>
  >;
  isToggling: boolean;
  isUploadingImage: boolean;
}

function ProductRow({
  product,
  idx,
  onToggle,
  onEdit,
  onImageUpload,
  imageUploadRefs,
  isUploadingImage,
}: ProductRowProps) {
  const idStr = String(product.id);

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
        product.active
          ? "border-gray-200 bg-white"
          : "border-gray-100 bg-gray-50"
      }`}
      data-ocid={`products.item.${idx + 1}`}
    >
      {/* Image */}
      <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
        {product.imageBase64 ? (
          <img
            src={`data:image/jpeg;base64,${product.imageBase64}`}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <Package className="w-5 h-5 text-gray-300" />
        )}
      </div>

      {/* Name & unit */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm truncate ${product.active ? "text-gray-900" : "text-gray-400"}`}
        >
          {product.name}
        </p>
        <p className="text-xs text-gray-400">
          {product.unit} &bull; ₹{product.rate.toFixed(2)}
        </p>
      </div>

      {/* Status badge */}
      <Badge
        variant={product.active ? "default" : "secondary"}
        className={`shrink-0 text-xs ${product.active ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500"}`}
      >
        {product.active ? "Active" : "Inactive"}
      </Badge>

      {/* Toggle */}
      <Switch
        checked={product.active}
        onCheckedChange={onToggle}
        className="shrink-0"
        data-ocid={`products.toggle.${idx + 1}`}
      />

      {/* Image upload button */}
      <>
        <button
          type="button"
          title="Upload image"
          className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-emerald-600 transition-colors"
          onClick={() => imageUploadRefs.current[idStr]?.click()}
          disabled={isUploadingImage}
          data-ocid={`products.image.upload_button.${idx + 1}`}
        >
          <Camera className="w-4 h-4" />
        </button>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={(el) => {
            imageUploadRefs.current[idStr] = el;
          }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImageUpload(file);
            e.target.value = "";
          }}
        />
      </>

      {/* Edit */}
      <button
        type="button"
        title="Edit product"
        className="shrink-0 p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors"
        onClick={onEdit}
        data-ocid={`products.edit_button.${idx + 1}`}
      >
        <Pencil className="w-4 h-4" />
      </button>
    </div>
  );
}
