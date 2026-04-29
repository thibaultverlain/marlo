"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Search,
  ShoppingBag, FileText, Calculator, Settings, Menu, X, BarChart3, Users2, ListTodo,
} from "lucide-react";
import PushNotificationToggle from "./push-toggle";
import ThemeToggle from "./theme-toggle";
import LogoutButton from "./logout-button";
import { MarloIcon, MarloWordmark } from "./marlo-logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, alertKey: "dashboard", minRole: "seller" },
  { href: "/products", label: "Stock", icon: Package, alertKey: "products", minRole: "seller" },
  { href: "/sales", label: "Ventes", icon: ShoppingCart, minRole: "seller" },
  { href: "/customers", label: "Clients", icon: Users, minRole: "manager" },
  { href: "/analytics", label: "Analytique", icon: BarChart3, minRole: "manager" },
  { href: "/sourcing", label: "Sourcing", icon: Search, alertKey: "sourcing", minRole: "manager" },
  { href: "/personal-shopping", label: "Personal Shop", icon: ShoppingBag, minRole: "manager" },
  { href: "/tasks", label: "Tâches", icon: ListTodo, minRole: "seller" },
  { href: "/invoices", label: "Factures", icon: FileText, minRole: "owner" },
  { href: "/accounting", label: "Comptabilité", icon: Calculator, minRole: "owner" },
];

const BOTTOM_ITEMS = [
  { href: "/team", label: "Équipe", icon: Users2, minRole: "owner" },
  { href: "/settings", label: "Réglages", icon: Settings, minRole: "owner" },
];

const ROLE_LEVEL: Record<string, number> = { owner: 3, manager: 2, seller: 1 };

export default function Sidebar({ role = "owner" }: { role?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const userLevel = ROLE_LEVEL[role] ?? 1;

  const visibleNav = NAV_ITEMS.filter((item) => userLevel >= (ROLE_LEVEL[item.minRole] ?? 3));
  const visibleBottom = BOTTOM_ITEMS.filter((item) => userLevel >= (ROLE_LEVEL[item.minRole] ?? 3));

  useEffect(() => {
    fetch("/api/alerts").then((r) => r.json()).then((d) => setAlertCount(d.count ?? 0)).catch(() => {});
  }, [pathname]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--color-bg-sidebar)] border-b border-[var(--color-border)] flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-1.5">
          <MarloIcon size={28} />
          <MarloWordmark />
        </div>
        <button onClick={() => setOpen(!open)} className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all duration-150">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40" onClick={() => setOpen(false)} />}

      <aside className={`fixed top-0 bottom-0 w-[220px] bg-[var(--color-bg-sidebar)] flex flex-col z-50 border-r border-[var(--color-border)] transition-transform duration-200 ease-out lg:left-0 lg:translate-x-0 ${open ? "left-0 translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-5 py-5 hidden lg:block">
          <div className="flex items-center gap-1.5">
            <MarloIcon size={28} />
            <MarloWordmark />
          </div>
        </div>

        <div className="h-14 lg:hidden" />

        <nav className="flex-1 px-3 py-2 space-y-[2px] overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge = item.alertKey === "dashboard" && alertCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-[9px] lg:py-[8px] rounded-[10px] text-[13px] transition-all duration-200 ${
                  isActive
                    ? "bg-[var(--color-accent)]/12 text-[var(--color-accent)]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                }`}
                style={isActive ? { background: "rgba(251, 113, 133, 0.10)", color: "#fb7185" } : {}}
              >
                <Icon size={17} strokeWidth={isActive ? 1.8 : 1.5} />
                <span className={`flex-1 ${isActive ? "font-semibold" : "font-normal"}`}>{item.label}</span>
                {showBadge && (
                  <span className="w-[18px] h-[18px] rounded-full bg-rose-400/90 text-[9px] font-bold text-black flex items-center justify-center">
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[var(--color-border-subtle)] space-y-1">
          <PushNotificationToggle />
          <ThemeToggle />
          {visibleBottom.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-[8px] rounded-[10px] text-[13px] transition-all duration-200 ${
                  isActive ? "text-[var(--color-accent)]" : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]"
                }`}
                style={isActive ? { background: "rgba(251, 113, 133, 0.10)", color: "#fb7185" } : {}}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
