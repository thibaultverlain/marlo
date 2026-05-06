import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { FileText, Calculator, Receipt, FolderOpen, Building2 } from "lucide-react";
export const dynamic = "force-dynamic";

const ADMIN_SECTIONS = [
  {
    href: "/settings",
    label: "Informations legales",
    desc: "Raison sociale, SIRET, TVA, adresse",
    icon: Building2,
    iconClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
  },
  {
    href: "/accounting",
    label: "Comptabilite",
    desc: "Recettes, depenses, livre des achats",
    icon: Calculator,
    iconClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
  },
  {
    href: "/invoices",
    label: "Facturation",
    desc: "Generer et gerer les factures",
    icon: Receipt,
    iconClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
  },
  {
    href: "/admin/documents",
    label: "Documents administratifs",
    desc: "Kbis, statuts, assurances, contrats",
    icon: FolderOpen,
    iconClass: "text-violet-400",
    bgClass: "bg-violet-500/10",
  },
];

export default async function AdminPage() {
  const ctx = await getAuthContext();

  if (ctx.role !== "owner") {
    return (
      <div className="space-y-6 page-enter">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Administration</h1>
        <div className="card-static p-12 text-center">
          <p className="text-zinc-500 text-sm">Acces reserve au proprietaire.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Centre de gestion</h1>
        <p className="text-zinc-500 mt-1 text-sm">Administration de votre activite</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ADMIN_SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.href} href={s.href} className="card-hover p-5 flex items-start gap-4 group">
              <div className={`w-12 h-12 rounded-xl ${s.bgClass} flex items-center justify-center flex-shrink-0`}>
                <Icon size={22} className={s.iconClass} />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-white group-hover:text-rose-400 transition-colors">{s.label}</p>
                <p className="text-[12px] text-zinc-500 mt-0.5">{s.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
