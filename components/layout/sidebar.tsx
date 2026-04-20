"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Search,
  ShoppingBag, FileText, Calculator, Settings, Menu, X, Mail, BarChart3,
} from "lucide-react";
import PushNotificationToggle from "./push-toggle";
import ThemeToggle from "./theme-toggle";
import LogoutButton from "./logout-button";
import { MarloIcon, MarloWordmark } from "./marlo-logo";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, alertKey: "dashboard" },
  { href: "/products", label: "Stock", icon: Package, alertKey: "products" },
  { href: "/sales", label: "Ventes", icon: ShoppingCart },
  { href: "/customers", label: "Clients", icon: Users },
  { href: "/analytics", label: "Analytique", icon: BarChart3 },
  { href: "/sourcing", label: "Sourcing", icon: Search, alertKey: "sourcing" },
  { href: "/personal-shopping", label: "Personal Shop", icon: ShoppingBag },
  { href: "/import-email", label: "Import email", icon: Mail },
  { href: "/invoices", label: "Factures", icon: FileText },
  { href: "/accounting", label: "Comptabilité", icon: Calculator },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Réglages", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  // Fetch alert count
  useEffect(() => {
    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlertCount(d.count ?? 0))
      .catch(() => {});
  }, [pathname]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
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
        <button
          onClick={() => setOpen(!open)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 w-[220px] bg-[var(--color-bg-sidebar)] flex flex-col z-50 border-r border-[var(--color-border)] transition-transform duration-200 ease-out
          lg:left-0 lg:translate-x-0
          ${open ? "left-0 translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo - hidden on mobile (top bar has it) */}
        <div className="px-5 py-5 hidden lg:block">
          <div className="flex items-center gap-1.5">
            <MarloIcon size={28} />
            <MarloWordmark />
          </div>
        </div>

        {/* Mobile: spacer for top bar */}
        <div className="h-14 lg:hidden" />

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-1 space-y-px overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            const showBadge = item.alertKey === "dashboard" && alertCount > 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-[9px] lg:py-[7px] rounded-md text-[13px] transition-all duration-100 ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
                }`}
              >
                <Icon size={16} strokeWidth={isActive ? 1.8 : 1.5} />
                <span className={`flex-1 ${isActive ? "font-medium" : "font-normal"}`}>{item.label}</span>
                {showBadge && (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-black flex items-center justify-center">
                    {alertCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="px-2.5 py-3 border-t border-[var(--color-border)] space-y-1">
          <PushNotificationToggle />
          <ThemeToggle />
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2.5 py-[9px] lg:py-[7px] rounded-md text-[13px] transition-all duration-100 ${
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
                }`}
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
