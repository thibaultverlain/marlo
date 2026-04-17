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
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-[var(--color-bg-sidebar)] flex flex-col z-50 border-r border-[var(--color-border)]">
      {/* Logo */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <div>
            <h1 className="text-[15px] font-semibold text-white tracking-tight" style={{ fontFamily: "Inter, sans-serif" }}>
              Marlo
            </h1>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-1 space-y-px overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-all duration-100 ${
                isActive
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 1.8 : 1.5} />
              <span className={isActive ? "font-medium" : "font-normal"}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom nav */}
      <div className="px-2.5 py-3 border-t border-[var(--color-border)]">
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-all duration-100 ${
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
      </div>
    </aside>
  );
}
