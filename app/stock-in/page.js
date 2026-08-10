"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Edit3, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notifyActivity } from "@/lib/events";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, Label, Input, Select, TableSkeleton } from "@/components/ui";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ProductSelectCombobox from "@/components/products/ProductSelectCombobox";
import { formatDateTime, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 10;
const emptyForm = { main_product_name: "", product_id: "", supplier_id: "", quantity: "", cost_price: "", note: "" };

export default function StockInPage() {
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const loadProducts = useCallback(async () => {
    const [pRes, sRes] = await Promise.all([fetch("/api/products"), fetch("/api/suppliers")]);
    const [pData, sData] = await Promise.all([pRes.json(), sRes.json()]);
    setProducts(pData.products || []);
    setSuppliers(sData.suppliers || []);
  }, []);

  const loadHistory = useCallback(async (targetPage = 1) => {
    const res = await fetch(`/api/stock-in?page=${targetPage}&limit=${PAGE_SIZE}`, { cache: "no-store" });
    const data = await res.json();
    setHistory(data.stock_in || []);
    setPage(data.page || targetPage);
    setPages(data.pages || 1);
    setTotal(data.total || 0);
  }, []);

  useEffect(() => {
    Promise.all([loadProducts(), loadHistory(1)]).finally(() => setLoading(false));
  }, [loadProducts, loadHistory]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === String(form.product_id)),
    [products, form.product_id]
  );

  useEffect(() => {
    if (!selectedProduct) return;
    setForm((prev) => ({
      ...prev,
      supplier_id: prev.supplier_id || selectedProduct.supplier_id || "",
      cost_price: selectedProduct.cost_price ?? "",
    }));
  }, [selectedProduct]);

  const receiptTotal = (Number(form.quantity) || 0) * (Number(form.cost_price) || 0);
  const filteredHistory = history.filter((item) => {
    const q = searchText.trim().toLowerCase();
    if (!q) return true;
    return [item.product_main_name, item.product_sub_name, item.supplier_name, item.reference, item.sku]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  async function refresh(targetPage = page) {
    await Promise.all([loadProducts(), loadHistory(targetPage)]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to record stock.");
      toast.success(`Stock received: +${data.stock_in.quantity} ${data.stock_in.unit}.`);
      setForm(emptyForm);
      notifyActivity();
      await refresh(1);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/stock-in/${editingEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: editingEntry.quantity,
          cost_price: editingEntry.cost_price,
          supplier_id: editingEntry.supplier_id,
          note: editingEntry.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update stock-in.");
      toast.success("Stock-in record updated.");
      setEditingEntry(null);
      notifyActivity();
      await refresh(page);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id) {
    if (!confirm("Delete this stock-in? The received quantity will be removed from current stock.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stock-in/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to delete stock-in.");
      toast.success("Stock-in deleted and stock balance corrected.");
      notifyActivity();
      await refresh(history.length === 1 && page > 1 ? page - 1 : page);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return <AppShell title="Stock In"><TableSkeleton rows={10} /></AppShell>;
  }

  return (
    <AppShell title="Stock In">
      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5">
        <Card className="p-5 h-fit xl:sticky xl:top-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-success-soft border border-success/30 flex items-center justify-center text-success">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div><h2 className="font-display font-semibold">Receive Stock</h2><p className="text-xs text-text-faint">Add purchased quantity into inventory.</p></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Main Product</Label>
              <ProductSelectCombobox
                items={Array.from(
                  new Map(
                    products.map((p) => [
                      p.name,
                      { value: p.name, label: p.name },
                    ])
                  ).values()
                )}
                value={form.main_product_name}
                disabled={saving}
                placeholder="Select main product"
                searchPlaceholder="Search main product..."
                emptyText="No main product found."
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    main_product_name: value,
                    product_id: "",
                    cost_price: "",
                  }))
                }
              />
            </div>

            <div>
              <Label>Sub Product</Label>
              <ProductSelectCombobox
                items={products
                  .filter((p) => p.name === form.main_product_name)
                  .map((p) => ({
                    value: p.id,
                    label: p.sub_product || "Default",
                    description: `Stock ${Number(p.stock_qty || 0)}`,
                    product: p,
                  }))}
                value={form.product_id}
                disabled={!form.main_product_name || saving}
                placeholder={
                  form.main_product_name
                    ? "Select sub product"
                    : "Select main product first"
                }
                searchPlaceholder="Search sub product..."
                emptyText="No sub product found."
                onChange={(value, item) => {
                  const product = item?.product;

                  setForm((prev) => ({
                    ...prev,
                    product_id: value,
                    supplier_id:
                      prev.supplier_id ||
                      product?.supplier_id ||
                      "",
                    cost_price:
                      product?.cost_price ?? "",
                  }));
                }}
              />
            </div>

            {selectedProduct && <div className="rounded-xl border border-border-soft bg-bg-elevated-2 p-3 text-xs space-y-1">
              <p className="font-medium text-text">Product master price</p>
              <p className="text-text-muted">Saved cost: <b>{formatMoney(selectedProduct.cost_price || 0)}</b></p>
              <p className="text-text-muted">Selling price: <b>{formatMoney(selectedProduct.selling_price || 0)}</b></p>
              <p className="text-text-faint">Stock-in cost below is the purchase price for this receipt. It starts with the saved cost price.</p>
            </div>}

            <div><Label>Supplier</Label><Select disabled={saving} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">Product default supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select></div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Quantity</Label><Input required min="1" type="number" disabled={saving} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Stock-In Cost / Unit</Label><Input required min="0" step="0.01" type="number" disabled={saving} value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
            </div>

            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 flex items-center justify-between">
              <div><p className="text-xs text-text-muted">Receipt total</p><p className="text-[11px] text-text-faint">Qty × stock-in cost</p></div>
              <p className="font-mono-num text-xl font-semibold text-primary">{formatMoney(receiptTotal)}</p>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>{saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Recording...</> : "Record Stock In"}</Button>
          </form>
        </Card>

        <Card className="overflow-hidden min-w-0">
          <CardHeader className="flex-wrap">
            <div><CardTitle>Stock In History</CardTitle><p className="text-xs text-text-faint mt-1">{total} database records · newest first</p></div>
            <Input className="sm:max-w-xs" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search current page..." />
          </CardHeader>

          {editingEntry && <form onSubmit={saveEdit} className="m-4 p-4 rounded-xl border border-primary/20 bg-primary/5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="md:col-span-2 xl:col-span-4 flex items-center justify-between"><div><p className="font-medium">Edit Stock-In</p><p className="text-xs text-text-faint">{editingEntry.product_main_name} / {editingEntry.product_sub_name || "Default"}</p></div><button type="button" className="text-xs text-text-muted" onClick={() => setEditingEntry(null)}>Cancel</button></div>
            <div><Label>Main Product</Label><Input disabled value={editingEntry.product_main_name || ""} /></div>
            <div><Label>Sub Product</Label><Input disabled value={editingEntry.product_sub_name || "Default"} /></div>
            <div><Label>Quantity</Label><Input required min="1" type="number" value={editingEntry.quantity} onChange={(e) => setEditingEntry({ ...editingEntry, quantity: e.target.value })} /></div>
            <div><Label>Cost / Unit</Label><Input type="number" step="0.01" value={editingEntry.cost_price} onChange={(e) => setEditingEntry({ ...editingEntry, cost_price: e.target.value })} /></div>
            <div><Label>Supplier</Label><Select value={editingEntry.supplier_id || ""} onChange={(e) => setEditingEntry({ ...editingEntry, supplier_id: e.target.value })}><option value="">Default</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></div>
            <div className="md:col-span-2"><Label>Note</Label><Input value={editingEntry.note || ""} onChange={(e) => setEditingEntry({ ...editingEntry, note: e.target.value })} /></div>
            <div className="flex items-end"><Button type="submit" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Save</Button></div>
          </form>}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-bg-elevated-2"><tr className="text-left text-xs text-text-muted uppercase tracking-wide">
                <th className="px-4 py-3">Main Product</th><th className="px-4 py-3">Sub Product</th><th className="px-4 py-3">Supplier</th><th className="px-4 py-3 text-right">Qty</th><th className="px-4 py-3 text-right">Cost / Unit</th><th className="px-4 py-3 text-right">Total Cost</th><th className="px-4 py-3">Date</th><th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody>{filteredHistory.length === 0 ? <tr><td colSpan="8" className="py-12 text-center text-text-faint">No stock-in records.</td></tr> : filteredHistory.map((h) => <tr key={h.id} className="border-t border-border-soft hover:bg-bg-elevated-2/60">
                <td className="px-4 py-3 font-medium">{h.product_main_name || h.product_name}</td>
                <td className="px-4 py-3"><p>{h.product_sub_name || "Default"}</p><p className="text-[11px] text-text-faint">{h.sku || "No SKU"}</p></td>
                <td className="px-4 py-3 text-text-muted">{h.supplier_name || "—"}</td>
                <td className="px-4 py-3 text-right font-mono-num text-success">+{h.quantity} {h.unit}</td>
                <td className="px-4 py-3 text-right font-mono-num">{formatMoney(h.cost_price || 0)}</td>
                <td className="px-4 py-3 text-right font-mono-num font-medium">{formatMoney(h.total_cost || 0)}</td>
                <td className="px-4 py-3 text-xs text-text-faint">{formatDateTime(h.created_at)}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1"><button className="p-2 rounded-lg hover:bg-primary/10 text-primary" onClick={() => setEditingEntry({ ...h })}><Edit3 className="w-4 h-4" /></button><button disabled={deletingId === h.id} className="p-2 rounded-lg hover:bg-danger-soft text-danger disabled:opacity-50" onClick={() => deleteEntry(h.id)}>{deletingId === h.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button></div></td>
              </tr>)}</tbody>
            </table>
          </div>

          <Pagination page={page} pages={pages} total={total} label="stock-in records" onPageChange={loadHistory} />
        </Card>
      </div>
    </AppShell>
  );
}
