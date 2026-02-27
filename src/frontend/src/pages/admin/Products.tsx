import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "../../hooks/useActor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Upload, Package, Loader2, FileSpreadsheet, RefreshCw, Pencil, Check, X } from "lucide-react";
import * as XLSX from "xlsx";
import type { Product, ProductInput } from "../../backend.d";

interface DefaultProduct {
  name: string;
  unit: string;
  rate: number;
}

const DEFAULT_PRODUCTS: DefaultProduct[] = [
  { name: "Tomato", unit: "KGS", rate: 30 },
  { name: "Potato", unit: "KGS", rate: 25 },
  { name: "Onion", unit: "KGS", rate: 35 },
  { name: "Carrot", unit: "KGS", rate: 40 },
  { name: "Capsicum", unit: "KGS", rate: 60 },
  { name: "Cucumber", unit: "KGS", rate: 25 },
  { name: "Brinjal", unit: "KGS", rate: 30 },
  { name: "Cauliflower", unit: "EACH", rate: 40 },
  { name: "Cabbage", unit: "EACH", rate: 30 },
  { name: "Spinach", unit: "KGS", rate: 20 },
  { name: "Peas", unit: "KGS", rate: 80 },
  { name: "Beans", unit: "KGS", rate: 60 },
  { name: "Ladyfinger", unit: "KGS", rate: 40 },
  { name: "Bitter Gourd", unit: "KGS", rate: 35 },
  { name: "Bottle Gourd", unit: "EACH", rate: 25 },
  { name: "Ridge Gourd", unit: "KGS", rate: 30 },
  { name: "Snake Gourd", unit: "KGS", rate: 25 },
  { name: "Drumstick", unit: "KGS", rate: 50 },
  { name: "Pumpkin", unit: "KGS", rate: 30 },
  { name: "Ash Gourd", unit: "KGS", rate: 20 },
  { name: "Radish", unit: "KGS", rate: 20 },
  { name: "Turnip", unit: "KGS", rate: 25 },
  { name: "Beetroot", unit: "KGS", rate: 35 },
  { name: "Sweet Potato", unit: "KGS", rate: 40 },
  { name: "Yam", unit: "KGS", rate: 30 },
  { name: "Colocasia", unit: "KGS", rate: 35 },
  { name: "Raw Banana", unit: "KGS", rate: 30 },
  { name: "Plantain", unit: "EACH", rate: 5 },
  { name: "Jackfruit", unit: "KGS", rate: 40 },
  { name: "Raw Mango", unit: "KGS", rate: 60 },
  { name: "Lemon", unit: "KGS", rate: 80 },
  { name: "Ginger", unit: "KGS", rate: 100 },
  { name: "Garlic", unit: "KGS", rate: 120 },
  { name: "Green Chilli", unit: "KGS", rate: 80 },
  { name: "Curry Leaves", unit: "KGS", rate: 100 },
  { name: "Coriander", unit: "KGS", rate: 60 },
  { name: "Fenugreek", unit: "KGS", rate: 40 },
  { name: "Mint", unit: "KGS", rate: 60 },
  { name: "Spring Onion", unit: "KGS", rate: 40 },
  { name: "Celery", unit: "KGS", rate: 80 },
  { name: "Broccoli", unit: "KGS", rate: 80 },
  { name: "Baby Corn", unit: "KGS", rate: 60 },
  { name: "Zucchini", unit: "KGS", rate: 70 },
  { name: "Lettuce", unit: "KGS", rate: 80 },
  { name: "Iceberg Lettuce", unit: "EACH", rate: 60 },
  { name: "Cherry Tomato", unit: "KGS", rate: 80 },
  { name: "Mushroom", unit: "KGS", rate: 120 },
  { name: "Corn", unit: "EACH", rate: 15 },
  { name: "Sweet Corn", unit: "EACH", rate: 20 },
  { name: "Asparagus", unit: "KGS", rate: 150 },
  { name: "Apple", unit: "KGS", rate: 120 },
  { name: "Banana", unit: "KGS", rate: 50 },
  { name: "Mango", unit: "KGS", rate: 80 },
  { name: "Orange", unit: "KGS", rate: 60 },
  { name: "Grapes", unit: "KGS", rate: 80 },
  { name: "Watermelon", unit: "KGS", rate: 25 },
  { name: "Muskmelon", unit: "KGS", rate: 30 },
  { name: "Papaya", unit: "KGS", rate: 30 },
  { name: "Pineapple", unit: "EACH", rate: 60 },
  { name: "Guava", unit: "KGS", rate: 40 },
  { name: "Pomegranate", unit: "KGS", rate: 100 },
  { name: "Kiwi", unit: "EACH", rate: 30 },
  { name: "Strawberry", unit: "KGS", rate: 200 },
  { name: "Dragon Fruit", unit: "EACH", rate: 100 },
  { name: "Avocado", unit: "EACH", rate: 80 },
  { name: "Pear", unit: "KGS", rate: 80 },
  { name: "Plum", unit: "KGS", rate: 100 },
  { name: "Peach", unit: "KGS", rate: 120 },
  { name: "Litchi", unit: "KGS", rate: 100 },
  { name: "Coconut", unit: "EACH", rate: 40 },
  { name: "Tender Coconut", unit: "EACH", rate: 50 },
  { name: "Date", unit: "KGS", rate: 150 },
  { name: "Fig", unit: "KGS", rate: 200 },
  { name: "Blueberry", unit: "KGS", rate: 300 },
  { name: "Raspberry", unit: "KGS", rate: 250 },
  { name: "Sapota", unit: "KGS", rate: 60 },
  { name: "Star Fruit", unit: "KGS", rate: 80 },
  { name: "Passion Fruit", unit: "KGS", rate: 120 },
  { name: "Wood Apple", unit: "EACH", rate: 20 },
  { name: "Custard Apple", unit: "KGS", rate: 60 },
  { name: "Red Capsicum", unit: "KGS", rate: 80 },
  { name: "Yellow Capsicum", unit: "KGS", rate: 80 },
  { name: "Baby Potato", unit: "KGS", rate: 40 },
  { name: "Cherry", unit: "KGS", rate: 200 },
  { name: "Amla", unit: "KGS", rate: 60 },
  { name: "Arbi", unit: "KGS", rate: 40 },
  { name: "Suran", unit: "KGS", rate: 30 },
  { name: "Lotus Stem", unit: "KGS", rate: 80 },
  { name: "Parsley", unit: "KGS", rate: 80 },
  { name: "Rosemary", unit: "KGS", rate: 100 },
  { name: "Basil", unit: "KGS", rate: 80 },
  { name: "Thyme", unit: "KGS", rate: 100 },
  { name: "Sage", unit: "KGS", rate: 80 },
  { name: "Leek", unit: "KGS", rate: 60 },
  { name: "Artichoke", unit: "EACH", rate: 40 },
  { name: "Pak Choi", unit: "KGS", rate: 60 },
  { name: "Bok Choy", unit: "KGS", rate: 70 },
  { name: "Kale", unit: "KGS", rate: 80 },
  { name: "Swiss Chard", unit: "KGS", rate: 70 },
  { name: "Water Chestnut", unit: "KGS", rate: 80 },
];

export default function Products() {
  const { actor, isFetching } = useActor();
  const token = localStorage.getItem("a1vs_admin_token") ?? "";
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingDefaults, setIsLoadingDefaults] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>("");

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["admin-products", token],
    queryFn: () => actor!.getAllProducts(token),
    enabled: !!actor && !isFetching && !!token,
  });

  const toggleMutation = useMutation({
    mutationFn: (productId: bigint) => actor!.toggleProduct(token, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["active-products"] });
      toast.success("Product status updated");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update product";
      toast.error(msg);
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: ({ productId, rate }: { productId: bigint; rate: number }) =>
      actor!.updateProductRate(token, productId, rate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["active-products"] });
      toast.success("Rate updated");
      setEditingRateId(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to update rate";
      toast.error(msg);
    },
  });

  const handleDownloadTemplate = () => {
    const sourceData = products.length > 0 ? products : DEFAULT_PRODUCTS;
    const rows = sourceData.map((p) => ({
      Name: p.name,
      Unit: p.unit,
      Rate: typeof (p as Product).rate === "number" ? (p as Product).rate : (p as DefaultProduct).rate,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 30 }, { wch: 10 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "a1vs_products_template.xlsx");
  };

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

      const items: ProductInput[] = rows
        .map((row) => {
          const nameVal = row["Name"] ?? row["Product Name"] ?? row["product name"] ?? row["name"];
          const unitVal = row["Unit"] ?? row["unit"] ?? "KGS";
          const rateVal = row["Rate"] ?? row["rate"] ?? 0;
          const name = typeof nameVal === "string" ? nameVal.trim() : null;
          const unit = typeof unitVal === "string" ? unitVal.trim().toUpperCase() : "KGS";
          const rate = typeof rateVal === "number" ? rateVal : parseFloat(String(rateVal)) || 0;
          if (!name || name.length === 0) return null;
          return { name, unit, rate };
        })
        .filter((v): v is ProductInput => v !== null)
        .slice(0, 100);

      if (items.length === 0) {
        toast.error("No products found. Ensure columns are named 'Name', 'Unit', 'Rate'");
        return;
      }

      await actor.replaceProductsWithDetails(token, items);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["active-products"] });
      toast.success(`${items.length} products uploaded successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload products";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleLoadDefaults = async () => {
    if (!actor) return;
    setIsLoadingDefaults(true);
    try {
      await actor.replaceProductsWithDetails(token, DEFAULT_PRODUCTS);
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["active-products"] });
      toast.success("100 default products loaded successfully");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load default products";
      toast.error(msg);
    } finally {
      setIsLoadingDefaults(false);
    }
  };

  const startEditRate = (product: Product) => {
    setEditingRateId(product.id.toString());
    setEditingRateValue(product.rate.toString());
  };

  const commitEditRate = (product: Product) => {
    const newRate = parseFloat(editingRateValue);
    if (isNaN(newRate) || newRate < 0) {
      toast.error("Please enter a valid rate");
      return;
    }
    updateRateMutation.mutate({ productId: product.id, rate: newRate });
  };

  const cancelEditRate = () => {
    setEditingRateId(null);
    setEditingRateValue("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Products</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your vegetable and fruit catalog — update rates daily</p>
      </div>

      {/* Upload Card */}
      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            Product Management
          </CardTitle>
          <CardDescription>
            Download the template (with current products), edit rates/names, then re-upload. Template columns: Name, Unit (KGS/EACH), Rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
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
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
          </div>
          <Button
            variant="secondary"
            onClick={handleLoadDefaults}
            disabled={isLoadingDefaults || !actor}
            className="gap-2"
          >
            {isLoadingDefaults ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {isLoadingDefaults ? "Loading..." : "Load 100 Default Products"}
          </Button>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="shadow-xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Product List
            </CardTitle>
            {!isLoading && (
              <Badge variant="secondary">{products.length} products</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {["p1", "p2", "p3", "p4", "p5"].map((k) => (
                <Skeleton key={k} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No products yet</p>
              <p className="text-xs mt-1">Upload an Excel file or click "Load 100 Default Products"</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unit</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate (₹)</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Toggle</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, idx) => {
                    const isEditingRate = editingRateId === product.id.toString();
                    return (
                      <tr key={product.id.toString()} className="border-b border-border/50 hover:bg-muted/40 transition-colors">
                        <td className="px-6 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{product.name}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-mono">{product.unit}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {isEditingRate ? (
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                value={editingRateValue}
                                onChange={(e) => setEditingRateValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") commitEditRate(product);
                                  if (e.key === "Escape") cancelEditRate();
                                }}
                                className="h-7 w-20 text-xs"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => commitEditRate(product)}
                                className="w-6 h-6 rounded flex items-center justify-center bg-success/15 text-success hover:bg-success/25 transition-colors"
                                disabled={updateRateMutation.isPending}
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditRate}
                                className="w-6 h-6 rounded flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditRate(product)}
                              className="flex items-center gap-1.5 group text-sm"
                            >
                              <span className="font-semibold">₹{product.rate}</span>
                              <Pencil className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {product.active ? (
                            <Badge className="bg-success/15 text-success border-0">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Switch
                            id={`toggle-${product.id}`}
                            checked={product.active}
                            onCheckedChange={() => toggleMutation.mutate(product.id)}
                            disabled={toggleMutation.isPending}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
