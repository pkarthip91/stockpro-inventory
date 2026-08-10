"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileSpreadsheet,
  Filter,
  History,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { notifyActivity } from "@/lib/events";
import AppShell from "@/components/layout/AppShell";
import { Badge, Card, Input, TableSkeleton } from "@/components/ui";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import ProductImportDialog from "@/components/products/ProductImportDialog";
import { formatDateTime, formatMoney } from "@/lib/utils";

const PAGE_SIZE = 10;

function SortButton({ label, field, sort, onSort, align = "left" }) {
  const active = sort.field === field;
  const Icon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`inline-flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted hover:text-text ${align === "right" ? "justify-end" : "justify-start"
        }`}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <Icon className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-text-faint"}`} />
    </button>
  );
}

function toLocalDateTimeInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const pad = (value) => String(value).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [mainSearch, setMainSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [latestImport, setLatestImport] = useState(null);
  const [deletingLatest, setDeletingLatest] = useState(false);
  const [deletingGroupKey, setDeletingGroupKey] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [datePreset, setDatePreset] = useState("all");
  const [fromDateTime, setFromDateTime] = useState("");
  const [toDateTime, setToDateTime] = useState("");
  const [sort, setSort] = useState({ field: "main", direction: "asc" });
  const [search, setSearch] = useState("");

  const loadLatestImport = useCallback(async () => {
    try {
      const res = await fetch("/api/products/import-file", { cache: "no-store" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || "Unable to load latest import.");
      setLatestImport(data.latestImport || null);
    } catch (error) {
      console.error("Latest import:", error);
      setLatestImport(null);
    }
  }, []);

  const resolvedDateRange = useMemo(() => {
    const now = new Date();
    if (datePreset === "hour") {
      return { from: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), to: now.toISOString(), importedOnly: true };
    }
    if (datePreset === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return { from: start.toISOString(), to: now.toISOString(), importedOnly: true };
    }
    if (datePreset === "24h") {
      return { from: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), to: now.toISOString(), importedOnly: true };
    }
    if (datePreset === "imported") {
      return { from: "", to: "", importedOnly: true };
    }
    if (datePreset === "custom") {
      return {
        from: fromDateTime ? new Date(fromDateTime).toISOString() : "",
        to: toDateTime ? new Date(toDateTime).toISOString() : "",
        importedOnly: true,
      };
    }
    return { from: "", to: "", importedOnly: false };
  }, [datePreset, fromDateTime, toDateTime]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (mainSearch.trim()) params.set("main_q", mainSearch.trim());
      if (resolvedDateRange.importedOnly) params.set("imported_only", "1");
      if (resolvedDateRange.from) params.set("imported_from", resolvedDateRange.from);
      if (resolvedDateRange.to) params.set("imported_to", resolvedDateRange.to);

      const res = await fetch(`/api/products?${params.toString()}`, { cache: "no-store" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Products request failed (${res.status}).`);
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (error) {
      console.error("Products load:", error);
      setProducts([]);
      toast.error(error.message || "Unable to load products.");
    } finally {
      setLoading(false);
    }
  }, [mainSearch, resolvedDateRange]);



  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    loadLatestImport();
  }, [loadLatestImport]);

  useEffect(() => {
    setPage(1);
  }, [mainSearch, datePreset, fromDateTime, toDateTime, sort]);

  function compareValue(a, b, direction) {
    if (typeof a === "number" || typeof b === "number") {
      const result = Number(a || 0) - Number(b || 0);
      return direction === "asc" ? result : -result;
    }
    const result = String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
    return direction === "asc" ? result : -result;
  }

  const productGroups = useMemo(() => {
    const query = search.trim().toLowerCase();

    const groups = new Map();

    for (const product of products) {
      const mainName = String(product.name || "").toLowerCase();
      const subName = String(product.sub_product || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();

      const mainMatch = !query || mainName.includes(query);
      const subMatch =
        !query ||
        subName.includes(query) ||
        sku.includes(query);

      if (query && !mainMatch && !subMatch) {
        continue;
      }

      const key = mainName;

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          name: product.name,
          items: [],
          total_stock: 0,
          latest_at: product.imported_at || product.created_at,
          matchedSubProduct: false,
        });
      }

      const group = groups.get(key);

      group.items.push(product);
      group.total_stock += Number(product.stock_qty || 0);

      if (query && subMatch && !mainMatch) {
        group.matchedSubProduct = true;
      }
    }

    return Array.from(groups.values());
  }, [products, search]);

  useEffect(() => {
    const query = search.trim();

    if (!query) {
      setExpanded({});
      return;
    }

    setExpanded((prev) => {
      const next = { ...prev };

      productGroups.forEach((group) => {
        if (group.matchedSubProduct) {
          next[group.key] = true;
        }
      });

      return next;
    });
  }, [search, productGroups]);

  const pages = Math.max(1, Math.ceil(productGroups.length / PAGE_SIZE));
  const pagedGroups = useMemo(
    () => productGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [productGroups, page]
  );

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  function toggleExpanded(key) {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleSort(field) {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }


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

  async function handleDeleteLatestImport() {
    if (!latestImport) return;
    const when = latestImport.importedAt ? new Date(latestImport.importedAt).toLocaleString() : "recently";
    const ok = confirm(
      `Delete the latest imported batch?\n\nFile: ${latestImport.source || "Imported file"}\nImported: ${when}\nProducts: ${latestImport.count}\n\nProducts already used in Stock In, Stock Out or invoices will be protected.`
    );
    if (!ok) return;

    setDeletingLatest(true);
    try {
      const res = await fetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "latest_import" }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data.error || `Delete failed (${res.status}).`);

      if (data.blocked > 0) toast.warning(data.message);
      else toast.success(data.message || "Latest import deleted.");

      await Promise.all([load(), loadLatestImport()]);
      notifyActivity();
    } catch (error) {
      toast.error(error.message || "Unable to delete latest import.");
    } finally {
      setDeletingLatest(false);
    }
  }

  async function handleDeleteMainProduct(group) {
    if (!group?.items?.length) return;

    const confirmed = confirm(
      `Delete main product "${group.name}" and all ${group.items.length} sub-product${group.items.length === 1 ? "" : "s"}?\n\nThis cannot be undone. Products already protected by stock/sales history may be blocked by the API.`
    );
    if (!confirmed) return;

    setDeletingGroupKey(group.key);
    try {
      const failures = [];
      let deleted = 0;

      for (const item of group.items) {
        const res = await fetch(`/api/products/${item.id}`, { method: "DELETE" });
        const text = await res.text();
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        if (!res.ok) {
          failures.push(item.sub_product || item.name || "Product");
        } else {
          deleted += 1;
        }
      }

      if (failures.length > 0) {
        toast.warning(
          `${deleted} item${deleted === 1 ? "" : "s"} deleted. ${failures.length} protected item${failures.length === 1 ? " was" : "s were"} not deleted.`
        );
      } else {
        toast.success(`${group.name} deleted successfully.`);
      }

      await Promise.all([load(), loadLatestImport()]);
      notifyActivity();
    } catch (error) {
      console.error("Delete main product:", error);
      toast.error(error.message || "Unable to delete product.");
    } finally {
      setDeletingGroupKey("");
    }
  }

  function resetFilters() {
    setMainSearch("");
    setDatePreset("all");
    setFromDateTime("");
    setToDateTime("");
  }

  const hasFilters = Boolean(mainSearch || datePreset !== "all");
  const activeDateLabel = {
    all: "All products",
    imported: "Imported products",
    hour: "Imported in last hour",
    today: "Imported today",
    "24h": "Imported in last 24 hours",
    custom: "Custom import time",
  }[datePreset];

  return (
    <AppShell title="Products">
      <div className="mb-5 space-y-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
            <Input
              placeholder="Search product or sub product…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>



          <Button
            type="button"
            variant={filterOpen || datePreset !== "all" ? "primary" : "secondary"}
            size="md"
            onClick={() => setFilterOpen((value) => !value)}
          >
            <Filter className="h-4 w-4" />
            Filter
            {datePreset !== "all" && <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">1</span>}
          </Button>

          <Button type="button" variant="secondary" size="md" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" /> Import
          </Button>

          <Button as={Link} href="/product/add" size="md">
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>

        {filterOpen && (
          <Card className="overflow-hidden border-primary/15">
            <div className="flex items-start justify-between gap-3 border-b border-border-soft px-4 py-3">
              <div>
                <div className="flex items-center gap-2 font-semibold text-text">
                  <Filter className="h-4 w-4 text-primary" /> Product filters
                </div>
                <p className="mt-1 text-xs text-text-muted">Use import time to quickly find products added by a recent Excel upload.</p>
              </div>
              <button type="button" className="rounded-md p-1.5 text-text-muted hover:bg-bg-elevated-2" onClick={() => setFilterOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Imported date & time</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["all", "All"],
                    ["hour", "Last 1 hour"],
                    ["today", "Today"],
                    ["24h", "Last 24 hours"],
                    ["imported", "All imports"],
                    ["custom", "Custom"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDatePreset(value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${datePreset === value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border-soft bg-bg-elevated text-text-muted hover:text-text"
                        }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {datePreset === "custom" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs text-text-muted">
                      <span>From</span>
                      <Input type="datetime-local" value={fromDateTime} onChange={(e) => setFromDateTime(e.target.value)} />
                    </label>
                    <label className="space-y-1 text-xs text-text-muted">
                      <span>To</span>
                      <Input type="datetime-local" value={toDateTime} onChange={(e) => setToDateTime(e.target.value)} />
                    </label>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border-soft bg-bg-elevated p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-text">
                      <History className="h-4 w-4 text-primary" /> Latest import
                    </div>
                    {latestImport ? (
                      <div className="mt-2 space-y-1 text-xs text-text-muted">
                        <p className="font-medium text-text">{latestImport.source || "Imported file"}</p>
                        <p>{latestImport.count} imported sub-products</p>
                        <p className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {formatDateTime(latestImport.importedAt)}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-text-muted">No import batch found.</p>
                    )}
                  </div>

                  {latestImport && (
                    <Button type="button" variant="danger" size="sm" disabled={deletingLatest} onClick={handleDeleteLatestImport}>
                      {deletingLatest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete import
                    </Button>
                  )}
                </div>
                <p className="mt-3 border-t border-border-soft pt-3 text-[11px] leading-relaxed text-text-faint">
                  This deletes only the latest upload batch. Products already used in stock or sales are protected automatically.
                </p>
              </div>
            </div>

            {hasFilters && (
              <div className="flex items-center justify-between border-t border-border-soft px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Badge tone="info">{activeDateLabel}</Badge>
                  <span>{productGroups.length} main products shown</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="h-4 w-4" /> Clear filters
                </Button>
              </div>
            )}
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-soft bg-bg-elevated px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
            <span><strong className="text-text">{productGroups.length}</strong> main products</span>
            <span className="text-text-faint">•</span>
            <span><strong className="text-text">{products.length}</strong> sub products</span>
            {datePreset !== "all" && (
              <>
                <span className="text-text-faint">•</span>
                <Badge tone="info">{activeDateLabel}</Badge>
              </>
            )}
          </div>
          <p className="text-[11px] text-text-faint">Expand a main product to view its sub-products. Edit or remove sub-products from Product Edit.</p>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={8} cols={5} />
      ) : productGroups.length === 0 ? (
        <Card className="py-14 text-center">
          <PackageSearch className="mx-auto mb-3 h-8 w-8 text-text-faint" />
          <p className="font-medium text-text">No products found</p>
          <p className="mt-1 text-sm text-text-muted">
            {hasFilters ? "Try clearing the search or import-time filter." : "Add a product or import an Excel/CSV file."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead className="bg-bg-elevated-2">
                <tr className="border-b border-border-soft">
                  <th className="px-3 py-3"><SortButton label="Main product" field="main" sort={sort} onSort={toggleSort} /></th>
                  <th className="px-3 py-3"><SortButton label="Sub products" field="subs" sort={sort} onSort={toggleSort} align="right" /></th>
                  <th className="px-3 py-3"><SortButton label="Stock" field="stock" sort={sort} onSort={toggleSort} align="right" /></th>
                  <th className="px-3 py-3"><SortButton label="Latest added" field="added" sort={sort} onSort={toggleSort} align="right" /></th>
                  <th className="w-28 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedGroups.map((group) => {
                  const isOpen = Boolean(expanded[group.key]);
                  return (
                    <Fragment key={group.key}>
                      <tr className="border-b border-border-soft bg-bg-elevated hover:bg-bg-elevated-2/70">
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => toggleExpanded(group.key)}
                            className="group inline-flex items-center gap-2 text-left"
                            aria-expanded={isOpen}
                            aria-label={isOpen ? `Collapse ${group.name}` : `Expand ${group.name}`}
                          >
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-soft bg-bg text-text-muted transition group-hover:border-primary/30 group-hover:text-primary">
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                            <span>
                              <span className="block font-semibold text-text">{group.name}</span>
                              <span className="mt-0.5 block text-xs text-text-faint">{group.items.length} sub product{group.items.length === 1 ? "" : "s"}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 text-right"><Badge>{group.items.length}</Badge></td>
                        <td className="px-3 py-3 text-right font-mono-num font-medium text-text">{group.total_stock}</td>
                        <td className="px-3 py-3 text-right text-xs text-text-muted">{group.latest_at ? formatDateTime(group.latest_at) : "—"}</td>
                        <td className="px-3 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Link
                              href={`/products/${group.items[0]?.id}/edit`}
                              title="Edit main product and sub-products"
                              className="inline-flex rounded-md p-2 text-text-muted hover:bg-bg-elevated-2 hover:text-primary"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              title="Delete main product"
                              disabled={deletingGroupKey === group.key}
                              onClick={() => handleDeleteMainProduct(group)}
                              className="inline-flex rounded-md p-2 text-text-muted transition hover:bg-danger/10 hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingGroupKey === group.key ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr className="border-b border-border-soft bg-bg">
                          <td colSpan={5} className="px-4 pb-4 pt-0">
                            <div className="overflow-hidden rounded-xl border border-border-soft bg-bg-elevated">
                              <table className="w-full min-w-[760px] text-xs">
                                <thead className="bg-bg-elevated-2/70">
                                  <tr className="border-b border-border-soft text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                                    <th className="px-3 py-2.5 text-left">Sub product</th>
                                    <th className="px-3 py-2.5 text-right">Cost</th>
                                    <th className="px-3 py-2.5 text-right">Selling</th>
                                    <th className="px-3 py-2.5 text-right">Bulk qty</th>
                                    <th className="px-3 py-2.5 text-right">Bulk price</th>
                                    <th className="px-3 py-2.5 text-right">Stock</th>
                                    <th className="px-3 py-2.5 text-right">Added</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.items.map((item) => (
                                    <tr key={item.id} className="border-b border-border-soft last:border-0 hover:bg-bg-elevated-2/60">
                                      <td className="px-3 py-3">
                                        <div className="font-medium text-text">{item.sub_product || "Standard"}</div>

                                      </td>
                                      <td className="px-3 py-3 text-right font-mono-num">{formatMoney(item.cost_price)}</td>
                                      <td className="px-3 py-3 text-right font-mono-num">{formatMoney(item.selling_price)}</td>
                                      <td className="px-3 py-3 text-right font-mono-num">{item.pricing_tiers?.[0]?.min_qty ?? "—"}</td>
                                      <td className="px-3 py-3 text-right font-mono-num">
                                        {item.pricing_tiers?.[0]?.price != null ? formatMoney(item.pricing_tiers[0].price) : "—"}
                                      </td>
                                      <td className="px-3 py-3 text-right font-medium text-text">{formatPhysicalStock(item)}</td>
                                      <td className="px-3 py-3 text-right text-text-muted">
                                        {item.imported_at || item.created_at ? formatDateTime(item.imported_at || item.created_at) : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pages={pages}
            total={productGroups.length}
            label="main products"
            onPageChange={setPage}
          />
        </Card>
      )}

      <ProductImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={async () => {
          setPage(1);
          setDatePreset("hour");
          setFilterOpen(true);
          await Promise.all([load(), loadLatestImport()]);
          notifyActivity();
        }}
      />
    </AppShell>
  );
}
