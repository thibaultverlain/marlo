"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Search,
  ShoppingBag,
  FileText,
  Calculator,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Stock", icon: Package },
  { href: "/sales", label: "Ventes", icon: ShoppingCart },
  { href: "/customers", label: "Clients", icon: Users },
  { href: "/sourcing", label: "Sourcing", icon: Search },
  { href: "/personal-shopping", label: "Personal Shop", icon: ShoppingBag },
  { href: "/invoices", label: "Factures", icon: FileText },
  { href: "/accounting", label: "Comptabilité", icon: Calculator },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "Réglages", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] bg-[#1c1917] flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <h1 className="text-2xl text-white tracking-tight" style={{ fontFamily: "DM Serif Display, serif" }}>
          Marlo
        </h1>
        <p className="text-[11px] text-stone-500 mt-0.5 tracking-widest uppercase">
          Luxe Resell
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? "bg-amber-700/20 text-amber-400"
                  : "text-stone-400 hover:text-stone-200 hover:bg-white/5"
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span className={isActive ? "font-medium" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 py-4 border-t border-white/10">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stone-500 hover:text-stone-300 hover:bg-white/5 transition-all"
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
