"use client";
import { useEffect, useState } from "react";
import { Truck, Plus, Trash2, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Card, Input, Label, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";

const EMPTY = { name: "", contact_person: "", phone: "", email: "", address: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/suppliers");
    const data = await res.json();
    setSuppliers(data.suppliers || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      toast.error(data.error || "Something went wrong.");
      return;
    }
    toast.success("Supplier added.");
    setForm(EMPTY);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this supplier?")) return;
    const res = await fetch(`/api/suppliers?id=${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Supplier deleted.");
    else toast.error("Could not delete supplier.");
    load();
  }

  return (
    <AppShell title="Suppliers">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold-dim/40 flex items-center justify-center text-gold-soft">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base text-text">New Supplier</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Supplier
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {suppliers.length === 0 && (
            <Card className="p-10 text-center text-text-faint text-sm">No suppliers yet.</Card>
          )}
          {suppliers.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text font-display text-base">{s.name}</p>
                  {s.contact_person && <p className="text-sm text-text-muted mt-0.5">{s.contact_person}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-faint">
                    {s.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{s.phone}</span>}
                    {s.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{s.email}</span>}
                    {s.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone="gold">{s.product_count} products</Badge>
                  <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-bg-elevated-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
