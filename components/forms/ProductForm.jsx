"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { notifyActivity } from "@/lib/events";
import { Save, Loader2, Trash2 } from "lucide-react";
import { Card, Label, Input, Select } from "@/components/ui";
import Button from "@/components/ui/Button";

export default function ProductForm({ product }) {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const initialValues = product
    ? {
        name: product.name || "",
        category_id: product.category_id || "",
        supplier_id: product.supplier_id || "",
      }
    : {
        name: "",
        category_id: "",
        supplier_id: "",
      };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: initialValues });

  const [removedSubIds, setRemovedSubIds] = useState([]);
  const [subInputs, setSubInputs] = useState(
    product
      ? product.sub_products?.length
        ? product.sub_products.map((row) => ({
            id: row.id,
            name: row.name || "",
            cost_price: row.cost_price || "",
            selling_price: row.selling_price || "",
            bulk_qty:
              (row.pricing_tiers && row.pricing_tiers.find((t) => t.price != null)?.min_qty) || "",
            bulk_price:
              (row.pricing_tiers && row.pricing_tiers.find((t) => t.price != null)?.price) || "",
            pricing_tiers: row.pricing_tiers || [],
            pack_size: row.pack_size || "",
          }))
        : [
            {
              id: product.id,
              name: product.sub_product || "",
              cost_price: product.cost_price || "",
              selling_price: product.selling_price || "",
              bulk_qty:
                (product.pricing_tiers && product.pricing_tiers.find((t) => t.price != null)?.min_qty) || "",
              bulk_price:
                (product.pricing_tiers && product.pricing_tiers.find((t) => t.price != null)?.price) || "",
              pricing_tiers: product.pricing_tiers || [],
              pack_size: product.pack_size || "",
            },
          ]
      : [
          {
            name: "",
            cost_price: "",
            selling_price: "",
            bulk_qty: "",
            bulk_price: "",
            pricing_tiers: [],
            pack_size: "",
          },
        ]
  );

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => setCategories([]));
    fetch("/api/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers || []))
      .catch(() => setSuppliers([]));
  }, []);

  function addSub() {
    setSubInputs((s) => [...s, { name: "", cost_price: "", selling_price: "", bulk_qty: "", bulk_price: "", pack_size: "" }]);
  }
  function updateSubField(idx, field, val) {
    setSubInputs((s) => s.map((v, i) => (i === idx ? { ...v, [field]: val } : v)));
  }
  function removeSub(idx) {
    setSubInputs((s) => {
      const removed = s[idx];
      if (removed?.id) setRemovedSubIds((prev) => [...prev, removed.id]);
      return s.filter((_, i) => i !== idx);
    });
  }

  

  async function onSubmit(values) {
    setError("");
    setSaving(true);
    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PUT" : "POST";

    const payload = { ...values };
    delete payload.bulk_qty;
    delete payload.bulk_price;

    const subs = subInputs
      .map((s) => {
        const tier =
  s.bulk_qty !== "" &&
  s.bulk_qty !== null &&
  s.bulk_price !== "" &&
  s.bulk_price !== null
    ? [
        {
          min_qty: Number(s.bulk_qty),
          price: Number(s.bulk_price),
        },
      ]
    : [];

        return {
          id: s.id,
          name: (s.name || "").trim(),
          cost_price: s.cost_price,
          selling_price: s.selling_price,
          bulk_qty: s.bulk_qty,
          bulk_price: s.bulk_price,
          pricing_tiers: tier,
          pack_size: Number(s.pack_size) || 1,
        };
      })
      .filter((s) => s.name);

    if (!product) {
      if (subs.length > 1) {
        payload.sub_products = subs;
        const res = await fetch("/api/products/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setSaving(false);
        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          toast.error(data.error || "Something went wrong.");
          return;
        }
        toast.success("Products created successfully.");
        notifyActivity();
        router.push("/products");
        router.refresh();
        return;
      }

      if (subs.length === 1) {
  payload.sub_product = subs[0].name;
  payload.pack_size = Number(subs[0].pack_size) || 1;

  if (subs[0].cost_price)
    payload.cost_price = Number(subs[0].cost_price);

  if (subs[0].selling_price)
    payload.selling_price = Number(subs[0].selling_price);

  if (subs[0].bulk_qty && subs[0].bulk_price) {
    payload.pricing_tiers = [
      {
        min_qty: Number(subs[0].bulk_qty),
        price: Number(subs[0].bulk_price),
      },
    ];
  }
}
    } else {
      payload.sub_products = subs;
      if (removedSubIds.length > 0) payload.deleted_sub_product_ids = removedSubIds;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      toast.error(data.error || "Something went wrong.");
      return;
    }
    toast.success(product ? "Product updated successfully." : "Product created successfully.");
    notifyActivity();
    router.push("/products");
    router.refresh();
  }

  return (
    <Card className="p-6 max-w-8xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-4">
          <div>
            <Label>Product Name</Label>
            <Input disabled={saving} {...register("name", { required: true })} placeholder="e.g. Glenlivet Triple Cask 12x100cl" />
            {errors.name && <p className="text-xs text-danger mt-1">Product name is required.</p>}
          </div>

           <div>
            <Label>Sub product(s)</Label>
            <p className="text-xs text-text-faint mb-2">Set the product prices here. Bulk quantity and bulk price are optional — enter them only when this product has bulk pricing. Stock quantity is managed from Stock In.</p>
            <div className="space-y-3">
              {subInputs.map((s, i) => (
                <div key={i} className="grid grid-cols-1 lg:grid-cols-[minmax(220px,1fr)_120px_120px_100px_120px_50px] gap-2 items-end">
                  <div>
                    <Input disabled={saving} value={s.name} onChange={(e) => updateSubField(i, "name", e.target.value)} placeholder={`Sub product ${i + 1} (e.g. 12YO 700ml)`} />
                  </div>
                  <div>
                    <Input disabled={saving} value={s.cost_price} onChange={(e) => updateSubField(i, "cost_price", e.target.value)} placeholder="Master cost RM" />
                  </div>
                  <div>
                    <Input disabled={saving} value={s.selling_price} onChange={(e) => updateSubField(i, "selling_price", e.target.value)} placeholder="Selling RM" />
                  </div>
                  <div>
                    <Input disabled={saving} value={s.bulk_qty} onChange={(e) => updateSubField(i, "bulk_qty", e.target.value)} type="number" placeholder="Qty" />
                  </div>
                  <div>
                    <Input disabled={saving} value={s.bulk_price} onChange={(e) => updateSubField(i, "bulk_price", e.target.value)} type="number" step="0.01" placeholder="Bulk RM" />
                  </div>
                  <div className="flex justify-end">
                    {subInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSub(i)}
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md bg-red-50 text-red-600 p-2 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Button type="button" disabled={saving} onClick={addSub}>Add sub product</Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select {...register("category_id")}> 
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Supplier</Label>
              <Select {...register("supplier_id")}> 
                <option value="">Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          </div>

         
        </div>

        {error && (
          <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-md px-3 py-2">{error}</p>
        )}


        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {product ? "Save Changes" : "Create Product"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/products")}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
