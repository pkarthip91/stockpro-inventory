"use client";
import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, CardContent, Badge, PageSkeleton } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/stats", { cache: "no-store" })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || "Unable to load reports.");
        return json;
      })
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (!data && !error) return <AppShell title="Reports"><PageSkeleton /></AppShell>;
  if (error) return <AppShell title="Reports"><Card className="p-6 text-danger">{error}</Card></AppShell>;

  const kpis = data?.kpis || {};
  const categoryBreakdown = Array.isArray(data?.categoryBreakdown) ? data.categoryBreakdown : [];
  const recentMovements = Array.isArray(data?.recentMovements)
    ? data.recentMovements
    : [...(data?.recentStockIn || []), ...(data?.recentStockOut || [])]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12)
        .map((m) => ({ ...m, product_name: `${m.main_product || "Unknown"}${m.sub_product ? ` / ${m.sub_product}` : ""}` }));
  const lowStockProducts = Array.isArray(data?.lowStockProducts) ? data.lowStockProducts : [];

  return (
    <AppShell title="Reports">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5"><p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Total Revenue</p><p className="font-mono-num text-2xl text-gold-soft">{formatMoney(kpis.totalRevenue || 0)}</p></Card>
        <Card className="p-5"><p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Inventory Value (Cost)</p><p className="font-mono-num text-2xl text-text">{formatMoney(kpis.stockCostValue ?? kpis.stockValue ?? 0)}</p></Card>
        <Card className="p-5"><p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Outstanding Balance</p><p className="font-mono-num text-2xl text-danger">{formatMoney(kpis.totalOutstanding || 0)}</p></Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card><CardHeader><CardTitle>Category Valuation</CardTitle></CardHeader><CardContent className="space-y-3">
          {categoryBreakdown.length === 0 && <p className="text-sm text-text-faint">Category valuation will appear when category report data is available.</p>}
          {categoryBreakdown.map((c) => <div key={c.name} className="flex items-center justify-between"><div><p className="text-sm text-text">{c.name}</p><p className="text-[11px] text-text-faint">{c.product_count || 0} products</p></div><p className="font-mono-num text-sm text-text-muted">{formatMoney(c.value || 0)}</p></div>)}
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Reorder Watchlist</CardTitle></CardHeader><CardContent className="space-y-3">
          {lowStockProducts.length === 0 && <p className="text-sm text-text-faint">Nothing needs reordering.</p>}
          {lowStockProducts.map((p) => <div key={p.id} className="flex items-center justify-between"><p className="text-sm text-text">{p.name}</p><Badge tone="danger">{p.stock_qty}/{p.reorder_level}</Badge></div>)}
        </CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle>Recent Stock Movements</CardTitle></CardHeader><div className="divide-y divide-border-soft">
          {recentMovements.length === 0 && <p className="px-5 py-8 text-sm text-text-faint">No recent movements.</p>}
          {recentMovements.map((m, i) => <div key={m.id || i} className="flex items-center justify-between px-5 py-3"><div><p className="text-sm text-text">{m.product_name || m.main_product || "Unknown"}</p><p className="text-[11px] text-text-faint font-mono-num">{m.reference || "—"} · {formatDate(m.created_at)}</p></div><Badge tone={m.direction === "in" ? "success" : "danger"}>{m.direction === "in" ? "+" : "-"}{m.quantity} {m.unit}</Badge></div>)}
        </div></Card>
      </div>
    </AppShell>
  );
}
