"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatDate, formatMoney } from "@/lib/utils";

export default function StockOutConfirmationPage() {
  const searchParams = useSearchParams();
  const invoiceNo = searchParams.get("invoice_no");
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!invoiceNo) {
      setError("Invoice number missing.");
      setLoading(false);
      return;
    }

    fetch(`/api/stock-out/confirmation?invoice_no=${encodeURIComponent(invoiceNo)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setSale(null);
        } else {
          setSale(data.sale);
        }
      })
      .catch(() => setError("Unable to load sale confirmation."))
      .finally(() => setLoading(false));
  }, [invoiceNo]);

  function formatStockCount(quantity, unit, packSize) {
    if (unit === "CARTON") {
      return `${quantity * Number(packSize || 1)} bottles`;
    }
    return `${quantity} ${unit}`;
  }

  return (
    <AppShell title="Sale Confirmation">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide">Sale completed</p>
            <h1 className="text-2xl font-semibold">Sale confirmation</h1>
          </div>
          <Button as={Link} href="/stock-out" variant="secondary">
            <ArrowLeft className="w-4 h-4" /> Back to Stock Out
          </Button>
        </div>

        <Card className="p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-3/5" />
              <div className="h-4 bg-slate-200 rounded w-2/5" />
              <div className="h-4 bg-slate-200 rounded w-full" />
            </div>
          ) : error ? (
            <div className="space-y-3 text-danger">
              <p className="font-semibold">{error}</p>
              <p className="text-sm text-text-muted">Please return to Stock Out and try again.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs text-text-muted uppercase tracking-wide">Invoice</p>
                <p className="font-semibold text-lg">{sale.invoice_no}</p>
                <p className="text-sm text-text-muted">{formatDate(sale.created_at)}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border-soft p-4 bg-bg-elevated">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Buyer</p>
                  <p className="font-medium text-text">{sale.customer_name || "Walk-in"}</p>
                </div>
                <div className="rounded-lg border border-border-soft p-4 bg-bg-elevated">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Product</p>
                  <p className="font-medium text-text">{sale.product_name}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border-soft p-4 bg-bg-elevated">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Purchased</p>
                  <p className="font-medium text-text">{formatStockCount(sale.quantity, sale.unit, Number(sale.pack_size || 1))}</p>
                </div>
                <div className="rounded-lg border border-border-soft p-4 bg-bg-elevated">
                  <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Remaining stock</p>
                  <p className="font-medium text-text">{formatStockCount(sale.balance_after, sale.unit, Number(sale.pack_size || 1))}</p>
                </div>
              </div>

              <div className="rounded-lg border border-border-soft p-4 bg-bg-elevated space-y-3">
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Unit rate</span>
                  <span>{formatMoney(sale.rate)}</span>
                </div>
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Sale value</span>
                  <span>{formatMoney(sale.sale_value)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Invoice total</span>
                  <span>{formatMoney(sale.sale_value)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button as={Link} href={`/invoices/${sale.invoice_no}`} className="flex-1">
                  <FileText className="w-4 h-4 mr-2" /> View invoice
                </Button>
                <Button as={Link} href="/stock-out" variant="secondary" className="flex-1">
                  Continue stock out
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
