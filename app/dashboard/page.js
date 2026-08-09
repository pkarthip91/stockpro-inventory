"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Boxes, Package, Wallet, TriangleAlert } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle, PageSkeleton, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import { onActivity } from "@/lib/events";
import { formatDateTime, formatMoney } from "@/lib/utils";

function Kpi({ icon: Icon, label, value, help }) {
  return <Card className="p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-text-muted uppercase tracking-wide">{label}</p><p className="font-mono-num text-xl sm:text-2xl mt-1">{value}</p><p className="text-[11px] text-text-faint mt-1">{help}</p></div><div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center"><Icon className="w-5 h-5" /></div></div></Card>;
}

function History({ title, rows, direction }) {
  return <Card className="overflow-hidden"><CardHeader><CardTitle>{title}</CardTitle><Button as={Link} href={direction === "in" ? "/stock-in" : "/stock-out"} variant="secondary" size="sm">View all</Button></CardHeader><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-bg-elevated-2 text-xs text-text-muted uppercase"><tr><th className="text-left px-4 py-3">Main Product</th><th className="text-left px-4 py-3">Sub Product</th><th className="text-right px-4 py-3">Qty</th><th className="text-right px-4 py-3">Value</th><th className="text-left px-4 py-3">Reference</th><th className="text-left px-4 py-3">Date</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-text-faint">No history yet.</td></tr> : rows.map((r) => <tr key={r.id} className="border-t border-border-soft"><td className="px-4 py-3 font-medium">{r.main_product}</td><td className="px-4 py-3 text-text-muted">{r.sub_product}</td><td className={`px-4 py-3 text-right font-mono-num ${direction === "in" ? "text-success" : "text-danger"}`}>{direction === "in" ? "+" : "-"}{r.quantity} {r.unit}</td><td className="px-4 py-3 text-right font-mono-num">{formatMoney(r.amount)}</td><td className="px-4 py-3"><Badge>{r.invoice_no || r.reference}</Badge></td><td className="px-4 py-3 text-xs text-text-faint">{formatDateTime(r.created_at)}</td></tr>)}</tbody></table></div></Card>;
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
    setData(await res.json());
  }, []);
  useEffect(() => { load(); return onActivity(load); }, [load]);

  if (!data) return <AppShell title="Dashboard"><PageSkeleton /></AppShell>;
  const { kpis, recentStockIn, recentStockOut } = data;
  return <AppShell title="Dashboard">
    <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="font-display text-lg font-semibold">Inventory Overview</h2><p className="text-sm text-text-muted">Simple view of products, stock value, stock received and sales.</p></div><div className="flex gap-2"><Button as={Link} href="/stock-in"><ArrowDownToLine className="w-4 h-4" /> Stock In</Button><Button as={Link} href="/stock-out" variant="secondary"><ArrowUpFromLine className="w-4 h-4" /> Stock Out</Button></div></div>

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-5">
      <Kpi icon={Package} label="Main Products" value={kpis.mainProductCount} help={`${kpis.subProductCount} sub products`} />
      <Kpi icon={Boxes} label="Stock Quantity" value={kpis.totalStockUnits} help="All sub-product stock units" />
      <Kpi icon={Wallet} label="Stock Cost Value" value={formatMoney(kpis.stockCostValue)} help={`Sale value ${formatMoney(kpis.stockSaleValue)}`} />
      <Kpi icon={TriangleAlert} label="Low Stock" value={kpis.lowStockCount} help="At or below reorder level" />
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
      <Link href="/stock-in"><Card className="p-5 hover:border-success/40 transition h-full"><div className="flex items-center justify-between"><div><p className="text-sm text-text-muted">Stock In</p><p className="font-mono-num text-3xl mt-1">{kpis.stockInCount}</p><p className="text-xs text-text-faint">Total receiving records</p></div><div className="w-12 h-12 rounded-2xl bg-success-soft text-success flex items-center justify-center"><ArrowDownToLine /></div></div></Card></Link>
      <Link href="/stock-out"><Card className="p-5 hover:border-danger/40 transition h-full"><div className="flex items-center justify-between"><div><p className="text-sm text-text-muted">Stock Out / Sales</p><p className="font-mono-num text-3xl mt-1">{kpis.stockOutCount}</p><p className="text-xs text-text-faint">Revenue {formatMoney(kpis.totalRevenue)}</p></div><div className="w-12 h-12 rounded-2xl bg-danger-soft text-danger flex items-center justify-center"><ArrowUpFromLine /></div></div></Card></Link>
    </div>

    <div className="space-y-5"><History title="Latest Stock In" rows={recentStockIn} direction="in" /><History title="Latest Stock Out / Sales" rows={recentStockOut} direction="out" /></div>
  </AppShell>;
}
