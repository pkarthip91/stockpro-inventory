"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Package } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, Badge, Input, TableSkeleton } from "@/components/ui";
import Button from "@/components/ui/Button";
import Pagination from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/utils";

const PAGE_SIZE = 10;
export default function CategoryProductsPage() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  useEffect(() => { Promise.all([
    fetch(`/api/products?category_id=${id}`).then(r => r.json()),
    fetch("/api/categories").then(r => r.json()),
  ]).then(([p, c]) => { setProducts(p.products || []); setCategory((c.categories || []).find(x => String(x.id) === String(id)) || null); }).finally(() => setLoading(false)); }, [id]);
  const filtered = useMemo(() => products.filter(p => `${p.name} ${p.sub_product || ""} ${p.sku || ""}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [query]);
  if (loading) return <AppShell title="Category Products"><TableSkeleton rows={8} /></AppShell>;
  return <AppShell title={category?.name || "Category Products"}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div><Button as={Link} href="/categories" variant="secondary" size="sm"><ArrowLeft className="w-4 h-4" /> Categories</Button><p className="mt-3 text-sm text-text-muted">{category?.main_product_count || new Set(products.map(p => p.name)).size} main products · {products.length} sub products</p></div>
      <Input className="sm:max-w-xs" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." />
    </div>
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-bg-elevated-2"><tr className="text-left text-xs uppercase text-text-muted"><th className="px-4 py-3">Main Product</th><th className="px-4 py-3">Sub Product</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3 text-right">Cost</th><th className="px-4 py-3 text-right">Selling</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody>
      {rows.length === 0 ? <tr><td colSpan="6" className="py-12 text-center text-text-faint"><Package className="w-7 h-7 mx-auto mb-2" />No products in this category.</td></tr> : rows.map(p => <tr key={p.id} className="border-t border-border-soft"><td className="px-4 py-3 font-medium">{p.name}</td><td className="px-4 py-3">{p.sub_product || "Default"}</td><td className="px-4 py-3"><Badge tone={Number(p.stock_qty) <= Number(p.reorder_level) ? "danger" : "success"}>{p.stock_qty} {p.unit}</Badge></td><td className="px-4 py-3 text-right font-mono-num">{formatMoney(p.cost_price)}</td><td className="px-4 py-3 text-right font-mono-num">{formatMoney(p.selling_price)}</td><td className="px-4 py-3 text-right"><Link href={`/products/${p.id}/edit`} className="inline-flex p-2 rounded-lg text-primary hover:bg-primary/10" title="Edit product"><Pencil className="w-4 h-4" /></Link></td></tr>)}
    </tbody></table></div><Pagination page={page} pages={pages} total={filtered.length} label="sub products" onPageChange={setPage} /></Card>
  </AppShell>;
}
