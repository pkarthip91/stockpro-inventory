"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

export default function AppertizerProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = encodeURIComponent("appertizer");
    fetch(`/api/products?q=${q}`)
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Appertizer > Sub product - Product List">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold">Appertizer &gt; Sub product - Product List</h1>
        <Button as={Link} href="/product/add">Add Product</Button>
      </div>

      <Card className="p-4">
        {loading ? (
          <p className="text-sm text-text-muted">Loading...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-text-muted">No products found</p>
        ) : (
          <div className="space-y-3">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border-soft py-3">
                <div>
                  <div className="font-medium">{p.name}{p.sub_product ? ` — ${p.sub_product}` : ''}</div>
                  <div className="text-[13px] text-text-faint">{p.category_name || '—'}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-text-muted">{formatMoney(p.selling_price)}</div>
                  <Button as={Link} href={`/products/${p.id}`} variant="secondary" size="sm">View</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
