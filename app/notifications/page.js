"use client";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, AlertTriangle, FileText, Bell, CheckCheck } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { Card, Badge } from "@/components/ui";
import Button from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import { onActivity, notifyActivity } from "@/lib/events";

const ICONS = {
  stock_in: ArrowDownToLine,
  stock_out: ArrowUpFromLine,
  low_stock: AlertTriangle,
  invoice: FileText,
};

const TONES = {
  stock_in: "success",
  stock_out: "danger",
  low_stock: "gold",
  invoice: "info",
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "stock_in", label: "Stock In" },
  { value: "stock_out", label: "Stock Out" },
  { value: "low_stock", label: "Low Stock" },
  { value: "invoice", label: "Invoices" },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/notifications?limit=100");
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsubscribe = onActivity(load);
    return unsubscribe;
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    notifyActivity();
  }

  const filtered = filter ? notifications.filter((n) => n.type === filter) : notifications;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <AppShell title="Notifications">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f.value
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-text-muted hover:text-text hover:border-gold-dim"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllRead}>
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read ({unreadCount})
          </Button>
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="divide-y divide-border-soft">
          {!loading && filtered.length === 0 && (
            <div className="px-5 py-16 text-center text-text-faint">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              No notifications here yet.
            </div>
          )}
          {filtered.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <div key={n.id} className={`flex items-start gap-3 px-5 py-4 ${!n.is_read ? "bg-bg-elevated-2/50" : ""}`}>
                <div
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${
                    n.type === "stock_in"
                      ? "bg-success-soft border-success/40 text-success"
                      : n.type === "stock_out"
                      ? "bg-danger-soft border-danger/40 text-danger"
                      : n.type === "low_stock"
                      ? "bg-gold/10 border-gold-dim/40 text-gold"
                      : "bg-info-soft border-info/40 text-info"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge tone={TONES[n.type] || "default"}>{n.type.replace("_", " ")}</Badge>
                    <span className="text-[11px] text-text-faint">{formatDate(n.created_at)}</span>
                  </div>
                </div>
                {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />}
              </div>
            );
          })}
        </div>
      </Card>
    </AppShell>
  );
}
