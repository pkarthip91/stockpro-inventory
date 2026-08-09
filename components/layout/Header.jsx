"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, Bell, LogOut, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, FileText, Sun, Moon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn, formatDate } from "@/lib/utils";
import { onActivity } from "@/lib/events";

const ICONS = {
  stock_in: ArrowDownToLine,
  stock_out: ArrowUpFromLine,
  low_stock: AlertTriangle,
  invoice: FileText,
};

const TONES = {
  stock_in: "text-success",
  stock_out: "text-danger",
  low_stock: "text-gold",
  invoice: "text-info",
};

export default function Header({ title, onMenuClick, user }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  useEffect(() => setMounted(true), []);

  async function load() {
    try {
      const res = await fetch("/api/notifications?limit=15");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnread(data.unread || 0);
    } catch {}
  }

  useEffect(() => {
    load();
    const unsubscribe = onActivity(load);
    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    setUnread(0);
    setNotifications((n) => n.map((x) => ({ ...x, is_read: 1 })));
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b border-border-soft px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="lg:hidden p-1.5 text-text-muted hover:text-text">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-display text-lg sm:text-xl text-text truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md text-text-muted hover:text-text hover:bg-bg-elevated-2 transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="w-[18px] h-[18px]" strokeWidth={1.75} /> : <Moon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
          </button>
        )}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 rounded-md text-text-muted hover:text-text hover:bg-bg-elevated-2 transition-colors"
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.75} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger ring-2 ring-bg" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-bg-elevated border border-border rounded-lg shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
                <p className="text-sm font-medium text-text">Notifications</p>
                {unread > 0 && (
                  <button onClick={markAllRead} className="text-xs text-gold-soft hover:text-gold">
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-sm text-text-faint text-center">No notifications yet.</p>
              ) : (
                notifications.map((n) => {
                  const Icon = ICONS[n.type] || Bell;
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex items-start gap-2.5 px-4 py-3 border-b border-border-soft last:border-0",
                        !n.is_read && "bg-bg-elevated-2/60"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", TONES[n.type] || "text-text-muted")} strokeWidth={1.75} />
                      <div className="min-w-0">
                        <p className="text-xs text-text leading-snug">{n.message}</p>
                        <p className="text-[10px] text-text-faint mt-1">{formatDate(n.created_at)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="block text-center text-xs text-gold-soft hover:text-gold px-4 py-2.5 border-t border-border-soft"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-border-soft">
          <div className="w-7 h-7 rounded-full bg-gold/15 border border-gold-dim/40 flex items-center justify-center text-gold-soft text-xs font-medium">
            {(user?.name || "A").charAt(0)}
          </div>
          <span className="text-sm text-text-muted">{user?.name || "Admin"}</span>
        </div>

        <button onClick={handleLogout} className="p-2 rounded-md text-text-muted hover:text-danger hover:bg-bg-elevated-2 transition-colors" title="Log out">
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
