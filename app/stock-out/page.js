"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpFromLine, Loader2, CheckCircle2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notifyActivity } from "@/lib/events";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, Label, Input, Select, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { formatDate, formatMoney, formatDateTime } from "@/lib/utils";

export default function StockOutPage() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [productSummary, setProductSummary] = useState(null);
  const [customerSummary, setCustomerSummary] = useState(null);
  const [form, setForm] = useState({ main_product_name: "", product_id: "", customer_name: "", quantity: "" });
  const [historyFilter, setHistoryFilter] = useState({ product_id: "", customer_name: "" });
  const [searchText, setSearchText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const router = useRouter();

  const loadHistory = useCallback(async (opts = {}, targetPage = 1) => {
    const params = new URLSearchParams();
    if (opts.product_id) params.set("product_id", opts.product_id);
    if (opts.customer_name) params.set("customer_name", opts.customer_name);
    params.set("page", String(targetPage));
    params.set("limit", "10");
    const res = await fetch(`/api/stock-out?${params.toString()}`, { cache: "no-store" });
    const data = await res.json();
    setHistory(data.stock_out || []);
    setProductSummary(data.product_summary || null);
    setCustomerSummary(data.customer_summary || null);
    setPage(data.page || targetPage);
    setPages(data.pages || 1);
    setTotalRecords(data.total || 0);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data.products || []);
  }, []);

  useEffect(() => {
    loadProducts();
    loadHistory(historyFilter, 1);
  }, [loadProducts, loadHistory, historyFilter]);

  useEffect(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) {
      setFilteredHistory(history);
      return;
    }
    setFilteredHistory(
      history.filter((item) =>
        [item.product_name, item.customer_name, item.invoice_no, item.sku]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q))
      )
    );
  }, [history, searchText]);

  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));
  const qtyNum = Number(form.quantity) || 0;
  const activeProductName = historyFilter.product_id ? productSummary?.name : selectedProduct?.name;
  const activeStockQty = historyFilter.product_id ? productSummary?.stock_qty : selectedProduct?.stock_qty;
  const activeUnit = historyFilter.product_id ? productSummary?.unit : selectedProduct?.unit;
  const activePackSize = historyFilter.product_id ? productSummary?.pack_size : selectedProduct?.pack_size;
  const activeStockValue = historyFilter.product_id ? productSummary?.remaining_value : selectedProduct ? selectedProduct.stock_qty * selectedProduct.selling_price : null;
  const activeStockLabel = activeStockQty != null
    ? formatStockCount(activeStockQty, activeUnit, Number(activePackSize || 1))
    : "-";

  function getPackValue(product) {
    const size = Number(product?.pack_size || 1);
    if (!size || size <= 1) return null;
    return size;
  }

  function formatStockCount(quantity, unit, packSize) {
    if (unit === "CARTON") {
      return `${quantity * Number(packSize || 1)} bottles`;
    }
    return `${quantity} ${unit}`;
  }

  const totalBottlesSold = filteredHistory.reduce((sum, item) => {
    const packSize = Number(item.pack_size || 1);
    if (item.unit === "CARTON" && packSize > 1) {
      return sum + item.quantity * packSize;
    }
    return sum + item.quantity;
  }, 0);

  const totalRevenue = filteredHistory.reduce((sum, item) => sum + (item.sale_value || 0), 0);
  const averagePerBottle = totalBottlesSold > 0 ? totalRevenue / totalBottlesSold : 0;

  function getMatchedTier(product, qty) {
    const tiers = Array.isArray(product.pricing_tiers) ? product.pricing_tiers : [];
    return tiers.find((t) => {
      const min = Number(t.min_qty || 0);
      const max = t.max_qty == null ? Infinity : Number(t.max_qty);
      return qty >= min && qty <= max;
    });
  }

  function computeRate(product, qty) {
    const base = Number(product.selling_price || 0);
    const tier = getMatchedTier(product, qty);
    if (tier) {
      if (tier.price != null) return Number(tier.price);
      if (tier.discount_percent != null) return base * (1 - Number(tier.discount_percent) / 100);
    }
    return base;
  }

  const matchedTier = selectedProduct ? getMatchedTier(selectedProduct, qtyNum) : null;
  const calculatedRate = selectedProduct ? computeRate(selectedProduct, qtyNum) : 0;
  const saleValue = qtyNum * calculatedRate;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(null);
    setSaving(true);
    const res = await fetch("/api/stock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      toast.error(data.error || "Something went wrong.");
      return;
    }
    toast.success(`Sale recorded — Invoice ${data.stock_out.invoice_no} generated.`);
    notifyActivity();
    router.push(`/stock-out/confirmation?invoice_no=${encodeURIComponent(data.stock_out.invoice_no)}`);
  }

  async function handleDeleteStockOut(id) {
    if (!confirm("Delete this sale? This will restore stock and remove the invoice.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/stock-out/${id}`, { method: "DELETE" });
      setDeletingId(null);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Could not delete sale.");
        return;
      }
      toast.success("Sale deleted and stock restored.");
      notifyActivity();
      loadProducts();
      loadHistory(historyFilter, page);
    } catch (e) {
      setDeletingId(null);
      toast.error("Could not delete sale.");
    }
  }

  return (
    <AppShell title="Stock Out">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 h-fit p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-danger-soft border border-danger/40 flex items-center justify-center text-danger">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base text-text">Record a Sale</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Main Product</Label>
              <Select
                value={form.main_product_name}
                onChange={(e) => setForm({ ...form, main_product_name: e.target.value, product_id: "" })}
                required
                disabled={saving}
              >
                <option value="">Select main product</option>
                {Array.from(new Map(products.map((p) => [p.name, p])).values()).map((product) => (
                  <option key={product.name} value={product.name}>{product.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Sub product</Label>
              <Select
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                required
                disabled={!form.main_product_name || saving}
              >
                <option value="">Select sub product</option>
                {products
                  .filter((p) => p.name === form.main_product_name)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sub_product ? `${p.sub_product}` : "Default"} ({formatStockCount(p.stock_qty, p.unit, Number(p.pack_size || 1))} available)
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Label>Customer / Buyer</Label>
              <Input
                disabled={saving}
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                placeholder="Leave blank for Walk-in"
              />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input
                disabled={saving}
                type="number"
                min="1"
                max={selectedProduct?.stock_qty}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
              <p className="mt-2 text-xs text-text-faint">
                Enter the quantity to stock out.
              </p>
            </div>

            {selectedProduct && (
              <div className="rounded-lg bg-bg-elevated-2 border border-border-soft p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Rate (auto)</span>
                  <span className="font-mono-num text-text">
                    {formatMoney(calculatedRate)}
                    {matchedTier && matchedTier.price != null && matchedTier.price !== selectedProduct.selling_price && (
                      <span className="text-xs text-text-faint"> (set bulk price)</span>
                    )}
                    {matchedTier && matchedTier.price == null && matchedTier.discount_percent != null && (
                      <span className="text-xs text-text-faint"> (base {formatMoney(selectedProduct.selling_price)})</span>
                    )}
                    {!matchedTier && calculatedRate !== selectedProduct.selling_price && (
                      <span className="text-xs text-text-faint"> (base {formatMoney(selectedProduct.selling_price)})</span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-text-muted">Sale Value</span>
                  <span className="font-mono-num text-primary">{formatMoney(saleValue)}</span>
                </div>
                {selectedProduct.pricing_tiers && selectedProduct.pricing_tiers.length > 0 && (
                  <div className="text-xs text-text-faint">Pricing tiers: {selectedProduct.pricing_tiers.map((t, i) => `${t.min_qty || 0}${t.max_qty ? `-${t.max_qty}` : '+'} → ${t.price != null ? `RM ${t.price}` : `${t.discount_percent}% off`}${i < selectedProduct.pricing_tiers.length - 1 ? ', ' : ''}`)}</div>
                )}
              </div>
            )}
            <div className="rounded-lg bg-bg-elevated-2 border border-border-soft p-4">
              <p className="text-sm font-medium">Need multiple products?</p>
              <p className="text-xs text-text-faint mb-3">Use the invoice builder for multi-item orders and a full order list.</p>
              <Button as={Link} href="/invoices/new" variant="secondary" className="w-full">
                Create multi-item invoice
              </Button>
            </div>

            {error && <p className="text-sm text-danger bg-danger-soft border border-danger/30 rounded-md px-3 py-2">{error}</p>}
            {success && (
              <div className="text-sm text-success bg-success-soft border border-success/30 rounded-md px-3 py-2 space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Sale complete
                </p>
                <p>Invoice {success.invoice_no} generated · {formatStockCount(success.balance_after, success.unit, Number(success.pack_size || 1))} remaining</p>
                {success.customer_summary && (
                  <p className="text-xs">Customer total for this product: {success.customer_summary.total_qty} units · Spent {formatMoney(success.customer_summary.total_spent)}{success.customer_summary.last_purchase ? ` · Last: ${formatDate(success.customer_summary.last_purchase)}` : ''}</p>
                )}
                <Link href={`/invoices/${success.invoice_no}`} className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
                  <FileText className="w-3 h-3" /> View Invoice
                </Link>
              </div>
            )}

            <Button type="submit" variant="danger" className="w-full" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> <span className="ml-2">Recording sale...</span></> : "Complete Sale & Generate Invoice"}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          {/* <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
              <Label>Filter Product</Label>
              <Select
                value={historyFilter.product_id}
                onChange={(e) => setHistoryFilter({ ...historyFilter, product_id: e.target.value })}
              >
                <option value="">All products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
            <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
              <Label>Filter Buyer</Label>
              <Input
                value={historyFilter.customer_name}
                onChange={(e) => setHistoryFilter({ ...historyFilter, customer_name: e.target.value })}
                placeholder="Search by customer"
              />
            </div>
            <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
              <Label>Search History</Label>
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search table..."
              />
            </div>
          </div> */}
          {success ? (
            <div className="p-4 border-t border-border-soft">
              <div className="rounded-md p-4 bg-bg-elevated border border-border-soft">
                <p className="text-xs text-text-muted">Sale summary</p>
                <p className="mt-2 text-lg font-semibold text-text">{success.product_name}</p>
                <div className="grid grid-cols-1 gap-2 mt-3 text-sm text-text-faint">
                  <p>Buyer: {success.customer_name || "Walk-in"}</p>
                  <p>Purchased: {formatStockCount(success.quantity, success.unit, Number(success.pack_size || 1))}</p>
                  <p>Available now: {formatStockCount(success.balance_after, success.unit, Number(success.pack_size || 1))}</p>
                  {success.customer_summary && (
                    <p>Customer total: {success.customer_summary.total_qty} units · Spent {formatMoney(success.customer_summary.total_spent)}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 border-t border-border-soft">
              <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
                <p className="text-xs text-text-muted">Available</p>
                <p className="font-mono-num text-xl">{activeStockLabel}</p>
                <p className="text-xs text-text-faint">{activeProductName || (selectedProduct ? selectedProduct.name : 'Select a product')}</p>
              </div>
              <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
                <p className="text-xs text-text-muted">Balance value</p>
                <p className="font-mono-num text-xl">{formatMoney(activeStockValue ?? 0)}</p>
                <p className="text-xs text-text-faint">Remaining stock value</p>
              </div>
              <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
                <p className="text-xs text-text-muted">Total bottles sold</p>
                <p className="font-mono-num text-xl">{totalBottlesSold}</p>
                <p className="text-xs text-text-faint">Revenue: {formatMoney(totalRevenue)}</p>
                {totalBottlesSold > 0 && (
                  <p className="text-xs text-text-faint">Avg per bottle: {formatMoney(averagePerBottle)}</p>
                )}
              </div>
              <div className="rounded-md p-3 bg-bg-elevated border border-border-soft">
                <p className="text-xs text-text-muted">Customer overview</p>
                <p className="font-mono-num text-xl">{new Set(filteredHistory.map((item) => item.customer_name || 'Walk-in')).size}</p>
                <p className="text-xs text-text-faint">Orders: {filteredHistory.length}</p>
                {!historyFilter.customer_name && (
                  <p className="mt-2 text-xs text-text-faint">Customers: {new Set(filteredHistory.map((item) => item.customer_name || 'Walk-in')).size}</p>
                )}
              </div>
            </div>
          )}
          {success && (
            <div className="px-4 pt-4">
              <div className="rounded-md border border-border-soft bg-bg-elevated p-4 mb-4">
                <p className="text-xs text-text-muted">Latest sale</p>
                <p className="mt-1 text-sm font-medium">Invoice {success.invoice_no} created</p>
                <p className="text-xs text-text-faint">{formatStockCount(success.quantity, success.unit, Number(success.pack_size || 1))} sold to {success.customer_name || "Walk-in"}</p>
                <Link href={`/invoices/${success.invoice_no}`} className="mt-2 inline-flex items-center gap-1 text-primary hover:underline text-sm">
                  <FileText className="w-4 h-4" /> View invoice
                </Link>
              </div>
            </div>
          )}
          <CardHeader>
            <div><CardTitle>Stock Card — Sales History</CardTitle><p className="text-xs text-text-faint mt-1">{totalRecords} database records · page {page} of {pages}</p></div>
          </CardHeader>
          <div className="px-4 pb-4">
            <Input
              placeholder="Search history by customer, product, or invoice"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-bg-elevated">
                <tr className="border-b border-border-soft text-left text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Main Product</th>
                  <th className="px-5 py-3 font-medium">Sub Product</th>
                  <th className="px-5 py-3 font-medium">Buyer</th>
                  <th className="px-5 py-3 font-medium text-right">Qty / bottles</th>
                  <th className="px-5 py-3 font-medium text-right">Rate</th>
                  <th className="px-5 py-3 font-medium text-right">Sale Value</th>
                  <th className="px-5 py-3 font-medium text-right">Remaining stock</th>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-text-faint">No sales recorded yet.</td></tr>
                )}
                {filteredHistory.map((h) => (
                  <tr key={h.id} className="border-b border-border-soft border-dashed last:border-0">
                    <td className="px-5 py-3">
                      <p className="text-text font-medium">{h.product_main_name || h.product_name}</p>
                      <p className="text-[11px] text-text-faint">{formatDateTime(h.created_at)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-text-muted">{h.product_sub_name || "Default"}</p>
                      <p className="text-[11px] text-text-faint">SKU: {h.sku || "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-text-muted">{h.customer_name}</td>
                    <td className="px-5 py-3 text-right font-mono-num text-danger">-{formatStockCount(h.quantity, h.unit, Number(h.pack_size || 1))}</td>
                    <td className="px-5 py-3 text-right font-mono-num text-text-muted">{formatMoney(h.rate)}</td>
                    <td className="px-5 py-3 text-right font-mono-num text-text">{formatMoney(h.sale_value)}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone={h.balance_after <= 5 ? "danger" : "default"}>{formatStockCount(h.balance_after, h.unit, Number(h.pack_size || 1))}</Badge>
                    </td>
                    <td className="px-5 py-3 space-y-1">
                      <Link href={`/invoices/${h.invoice_no}`} className="inline-flex items-center gap-1 text-primary hover:underline font-mono-num text-xs">
                        <FileText className="w-3 h-3" /> {h.invoice_no}
                      </Link>
                      <Link href={`/invoices/${h.invoice_no}`} className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]">
                        View invoice
                      </Link>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleDeleteStockOut(h.id)}
                          disabled={deletingId === h.id}
                          className="inline-flex items-center gap-1 text-danger hover:underline text-[11px]"
                        >
                          {deletingId === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={totalRecords} label="sales" onPageChange={(p) => loadHistory(historyFilter, p)} />
        </Card>
      </div>
    </AppShell>
  );
}
