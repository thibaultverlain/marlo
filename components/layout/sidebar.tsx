"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Search,
  ShoppingBag, FileText, Calculator, Settings, Menu, X, BarChart3, Users2, ListTodo, Zap,
} from "lucide-react";
import ThemeToggle from "./theme-toggle";
import LogoutButton from "./logout-button";
import NotificationBell from "./notification-bell";
import ShopSwitcher from "./shop-switcher";
import { MarloIcon, MarloWordmark } from "./marlo-logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, alertKey: "dashboard", perm: "dashboard" },
  { href: "/products", label: "Stock", icon: Package, alertKey: "products", perm: "products" },
  { href: "/sales", label: "Ventes", icon: ShoppingCart, perm: "sales" },
  { href: "/customers", label: "Clients", icon: Users, perm: "customers" },
  { href: "/analytics", label: "Analytique", icon: BarChart3, perm: "analytics" },
  { href: "/sourcing", label: "Sourcing", icon: Search, alertKey: "sourcing", perm: "sourcing" },
  { href: "/personal-shopping", label: "Personal Shop", icon: ShoppingBag, perm: "personal_shopping" },
  { href: "/tasks", label: "Taches", icon: ListTodo, perm: "tasks" },
  { href: "/templates", label: "Templates", icon: FileText, perm: "templates" },
  { href: "/invoices", label: "Factures", icon: FileText, perm: "invoices" },
  { href: "/accounting", label: "Comptabilite", icon: Calculator, perm: "accounting" },
];

const BOTTOM_ITEMS = [
  { href: "/admin", label: "Administration", icon: Settings, perm: "settings" },
  { href: "/automations", label: "Automations", icon: Zap, perm: "automations" },
  { href: "/team", label: "Equipe", icon: Users2, perm: "team" },
];

type ShopInfo = { shopId: string; shopName: string; role: string };

export default function Sidebar({
  role = "owner",
  permissions = [],
  shops = [],
  currentShopId = "",
  currentShopName = "",
}: {
  role?: string;
  permissions?: string[];
  shops?: ShopInfo[];
  currentShopId?: string;
  currentShopName?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const isOwner = role === "owner";

  const visibleNav = NAV_ITEMS.filter((item) => isOwner || permissions.includes(item.perm));
  const visibleBottom = BOTTOM_ITEMS.filter((item) => isOwner || permissions.includes(item.perm));

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

        <ShopSwitcher shops={shops} currentShopId={currentShopId} currentShopName={currentShopName} />

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
          <NotificationBell />
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
