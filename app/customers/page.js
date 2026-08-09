"use client";
import { useEffect, useState } from "react";
import { Users, Plus, Trash2, Loader2, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import AppShell from "@/components/layout/AppShell";
import { Card, Input, Label, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatMoney } from "@/lib/utils";

const EMPTY = { name: "", phone: "", email: "", address: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data.customers || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/customers", {
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
    toast.success("Customer added.");
    setForm(EMPTY);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this customer?")) return;
    const res = await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
    if (res.ok) toast.success("Customer deleted.");
    else toast.error("Could not delete customer.");
    load();
  }

  return (
    <AppShell title="Customers">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 h-fit">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold-dim/40 flex items-center justify-center text-gold-soft">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="font-display text-base text-text">New Customer</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              Add Customer
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {customers.length === 0 && (
            <Card className="p-10 text-center text-text-faint text-sm">No customers yet.</Card>
          )}
          {customers.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-text font-display text-base">{c.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-text-faint">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                    {c.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge tone="gold">{c.invoice_count} invoices</Badge>
                  <Badge>{formatMoney(c.total_spent)}</Badge>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-bg-elevated-2">
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
