"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Users,
  Truck,
  BarChart3,
  Settings,
  Tags,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/product/add", label: "Add Product", icon: PackagePlus },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/stock-in", label: "Stock In", icon: ArrowDownToLine },
  { href: "/stock-out", label: "Stock Out", icon: ArrowUpFromLine },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const logoSrc = mounted && theme === "dark" ? "/logo-transparent-white.png" : "/logo-transparent.png";

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen w-64 bg-bg-sidebar border-r border-border-soft flex flex-col z-50 transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="px-2 py-2 border-b border-border-soft">
          <div className="relative w-full h-20">
            <Image src={logoSrc} alt="Nectar Heaven" fill className="object-contain object-left" priority />
          </div>
          {/* <p className="text-[10px] text-text-faint tracking-[0.15em] uppercase mt-1">StockPro Inventory</p> */}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href) && href !== "/product/add");
            const exactActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  exactActive
                    ? "bg-gold/10 text-gold-soft border border-gold-dim/40"
                    : "text-text-muted hover:text-text hover:bg-bg-elevated-2 border border-transparent"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-border-soft">
          <p className="text-[10px] text-text-faint tracking-wide">EST. 2013 · Cyberjaya, Selangor</p>
        </div>
      </aside>
    </>
  );
}
