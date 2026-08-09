"use client";
import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, Pencil, Trash2, PackageSearch, ChevronDown, ChevronUp, Loader2, DatabaseZap } from "lucide-react";
import { toast } from "sonner";
import { notifyActivity } from "@/lib/events";
import AppShell from "@/components/layout/AppShell";
import { Card, Badge, Input, Select, TableSkeleton } from "@/components/ui";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({ deleteId: null, deleteGroupKey: null });
  const [importingStock, setImportingStock] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoryId) params.set("category_id", categoryId);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data.products || []);
    setLoading(false);
  }, [q, categoryId]);

  const productGroups = Object.values(
    products.reduce((groups, product) => {
      const key = `${product.name}||${product.category_id || ""}`;
      const group = groups[key] || {
        key,
        name: product.name,
        category_name: product.category_name,
        category_id: product.category_id,
        unit: product.unit,
        items: [],
        total_stock: 0,
      };
      group.items.push(product);
      group.total_stock += Number(product.stock_qty) || 0;
      groups[key] = group;
      return groups;
    }, {})
  );
  const pages = Math.max(1, Math.ceil(productGroups.length / PAGE_SIZE));
  const pagedGroups = useMemo(() => productGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [productGroups, page]);

  useEffect(() => { setPage(1); }, [q, categoryId]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    if (products.length > 0 && Object.keys(expanded).length === 0) {
      setExpanded(Object.fromEntries(productGroups.map((group) => [group.key, true])));
    }
  }, [productGroups, products.length, expanded]);


  function formatPhysicalStock(item) {
    const qty = Number(item?.stock_qty || 0);
    const pack = Number(item?.pack_size || 1);
    if (item?.unit === "BOTTLE" && pack > 1) {
      const cartons = Math.floor(qty / pack);
      const bottles = qty % pack;
      if (cartons && bottles) return `${cartons} ctn ${bottles} bt (${qty} bt)`;
      if (cartons) return `${cartons} ctn (${qty} bt)`;
      return `${bottles} bt`;
    }
    return `${qty} ${item?.unit || ""}`.trim();
  }

  async function importBarStock() {
    if (!confirm("Import/update the product list and current stock? Existing matching products will be updated.")) return;
    setImportingStock(true);
    try {
      const res = await fetch("/api/products/import-product-list", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed.");
      toast.success(`${data.rows} stock rows imported. ${data.created} created, ${data.updated} updated.`);
      if (data.review?.length) {
        toast.info(`${data.review.length} handwritten names are marked for review.`);
      }
      notifyActivity();
      await load();
    } catch (err) {
      toast.error(err.message || "Import failed.");
    } finally {
      setImportingStock(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setActionLoading({ deleteId: id, deleteGroupKey: null });
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    setActionLoading({ deleteId: null, deleteGroupKey: null });
    if (res.ok) { toast.success("Product deleted."); notifyActivity(); }
    else toast.error("Could not delete product.");
    load();
  }

  async function handleDeleteGroup(group) {
    if (!confirm(`Delete all variants for "${group.name}"? This cannot be undone.`)) return;
    setActionLoading({ deleteId: null, deleteGroupKey: group.key });
    const responses = await Promise.all(group.items.map((item) => fetch(`/api/products/${item.id}`, { method: "DELETE" })));
    setActionLoading({ deleteId: null, deleteGroupKey: null });
    const failed = responses.some((res) => !res.ok);
    if (failed) {
      toast.error("One or more variants could not be deleted.");
    } else {
      toast.success("Product variants deleted.");
      notifyActivity();
    }
    load();
  }

  function toggleExpanded(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <AppShell title="Products">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint" />
          <Input placeholder="Search by name or SKU…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="sm:w-56">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        {/* <Button type="button" variant="secondary" size="md" disabled={importingStock} onClick={importBarStock}>
          {importingStock ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
          Import Product List
        </Button> */}
        <Button as={Link} href="/product/add" size="md">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {loading && products.length === 0 ? (
        <TableSkeleton rows={6} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-soft text-left text-xs text-text-muted uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium text-right">Stock</th>
                  <th className="px-5 py-3 font-medium text-right">Added</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!loading && products.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-text-faint">
                      <PackageSearch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No products found. Try adjusting your search or add a new product.
                    </td>
                  </tr>
                )}
                {pagedGroups.map((group) => (
                  <Fragment key={group.key}>
                    <tr className="border-b border-border-soft last:border-0 hover:bg-bg-elevated-2/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <button type="button" onClick={() => toggleExpanded(group.key)} className="inline-flex items-center gap-2 text-text-muted hover:text-text">
                          {expanded[group.key] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span className="font-medium">{group.name}</span>
                        </button>
                        <p className="text-[11px] text-text-faint font-mono-num">{group.items.length > 1 ? `${group.items.length} variants` : group.items[0]?.sub_product || "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-text-muted">{group.category_name || "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Badge tone={group.total_stock <= group.items[0]?.reorder_level ? "danger" : "success"}>
                          {group.total_stock} {group.unit}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right text-text-faint text-xs">{group.items[0]?.created_at ? formatDateTime(group.items[0].created_at) : "—"}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/products/${group.items[0]?.id}/edit`} className="p-1.5 rounded-md text-text-muted hover:text-gold-soft hover:bg-bg-elevated-2">
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteGroup(group)}
                            disabled={actionLoading.deleteGroupKey === group.key}
                            className="inline-flex items-center justify-center rounded-md p-1.5 text-text-muted hover:text-danger hover:bg-bg-elevated-2 disabled:cursor-not-allowed"
                          >
                            {actionLoading.deleteGroupKey === group.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded[group.key] && (
                      <tr className="bg-bg-elevated-2">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="space-y-4">
                            {group.items.map((item) => (
                              <div key={item.id} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 p-3 rounded-md bg-bg-default border border-border-soft">
                                <div>
                                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Sub product</p>
                                  <p>{item.sub_product || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Cost Price</p>
                                  <p>{formatMoney(item.cost_price)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Selling Price</p>
                                  <p>{formatMoney(item.selling_price)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Stock</p>
                                  <p>{formatPhysicalStock(item)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Bulk qty</p>
                                  <p>{item.pricing_tiers?.[0]?.min_qty ??
                                    item.bulk_qty ??
                                    6}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Bulk price</p>
                                  <p>{item.pricing_tiers?.[0]?.price != null
                                    ? formatMoney(item.pricing_tiers[0].price)
                                    : item.bulk_price != null
                                      ? formatMoney(item.bulk_price)
                                      : "—"}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pages={pages} total={productGroups.length} label="main products" onPageChange={setPage} />
        </Card>
      )}
    </AppShell>
  );
}
