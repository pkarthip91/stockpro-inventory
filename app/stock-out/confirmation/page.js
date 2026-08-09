"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatDate, formatMoney } from "@/lib/utils";

function StockOutConfirmationContent() {
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

    fetch(
      `/api/stock-out/confirmation?invoice_no=${encodeURIComponent(invoiceNo)}`
    )
      .then(async (res) => {
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Unable to load sale confirmation.");
        }

        return data;
      })
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setSale(null);
        } else {
          setSale(data.sale);
        }
      })
      .catch((err) => {
        setError(err.message || "Unable to load sale confirmation.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [invoiceNo]);

  function formatStockCount(quantity, unit, packSize) {
    const qty = Number(quantity || 0);
    const size = Number(packSize || 1);

    if (unit === "CARTON") {
      return `${qty * size} bottles`;
    }

    return `${qty} ${unit || ""}`.trim();
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-text-muted">
              Sale completed
            </p>

            <h1 className="text-2xl font-semibold text-text">
              Sale confirmation
            </h1>
          </div>

          <Button
            as={Link}
            href="/stock-out"
            variant="secondary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stock Out
          </Button>
        </div>

        <Card className="p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-3/5 rounded bg-slate-200" />
              <div className="h-4 w-2/5 rounded bg-slate-200" />
              <div className="h-4 w-full rounded bg-slate-200" />
            </div>
          ) : error ? (
            <div className="space-y-3 text-danger">
              <p className="font-semibold">
                {error}
              </p>

              <p className="text-sm text-text-muted">
                Please return to Stock Out and try again.
              </p>
            </div>
          ) : !sale ? (
            <div className="space-y-3">
              <p className="font-semibold text-text">
                Sale details not found.
              </p>

              <p className="text-sm text-text-muted">
                Please return to Stock Out and try again.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  Invoice
                </p>

                <p className="text-lg font-semibold text-text">
                  {sale.invoice_no}
                </p>

                <p className="text-sm text-text-muted">
                  {formatDate(sale.created_at)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border-soft bg-bg-elevated p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                    Buyer
                  </p>

                  <p className="font-medium text-text">
                    {sale.customer_name || "Walk-in"}
                  </p>
                </div>

                <div className="rounded-lg border border-border-soft bg-bg-elevated p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                    Product
                  </p>

                  <p className="font-medium text-text">
                    {sale.product_name || "-"}
                  </p>

                  {sale.sub_product_name && (
                    <p className="mt-1 text-sm text-text-muted">
                      {sale.sub_product_name}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border-soft bg-bg-elevated p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                    Purchased
                  </p>

                  <p className="font-medium text-text">
                    {formatStockCount(
                      sale.quantity,
                      sale.unit,
                      sale.pack_size
                    )}
                  </p>
                </div>

                <div className="rounded-lg border border-border-soft bg-bg-elevated p-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-text-muted">
                    Remaining stock
                  </p>

                  <p className="font-medium text-text">
                    {formatStockCount(
                      sale.balance_after,
                      sale.unit,
                      sale.pack_size
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border-soft bg-bg-elevated p-4">
                <div className="flex justify-between text-sm text-text-muted">
                  <span>Unit rate</span>

                  <span>
                    {formatMoney(sale.rate)}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-text-muted">
                  <span>Sale value</span>

                  <span>
                    {formatMoney(sale.sale_value)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-border-soft pt-3 text-sm font-semibold text-text">
                  <span>Invoice total</span>

                  <span>
                    {formatMoney(sale.sale_value)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  as={Link}
                  href={`/invoices/${sale.invoice_no}`}
                  className="flex-1"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View invoice
                </Button>

                <Button
                  as={Link}
                  href="/stock-out"
                  variant="secondary"
                  className="flex-1"
                >
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

function ConfirmationLoading() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-sm text-text-muted">
            Sale completed
          </p>

          <h1 className="text-2xl font-semibold text-text">
            Sale confirmation
          </h1>
        </div>

        <Card className="p-6">
          <div className="space-y-3">
            <div className="h-4 w-3/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-2/5 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

export default function StockOutConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationLoading />}>
      <StockOutConfirmationContent />
    </Suspense>
  );
}