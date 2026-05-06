import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllCustomers } from "@/lib/db/queries/customers";
import NewSourcingForm from "@/components/sourcing/new-sourcing-form";
export const dynamic = "force-dynamic";

export default async function NewSourcingPage() {
  const { shopId } = await getAuthContext();
  const customers = await getAllCustomers(shopId);
  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href="/sourcing" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl font-bold text-white tracking-tight">Nouvelle demande de sourcing</h1><p className="text-sm text-zinc-500 mt-0.5">Un client cherche une pièce</p></div>
      </div>
      {customers.length === 0 ? <div className="card-static p-10 text-center"><p className="text-zinc-500 mb-4 text-sm">Aucun client.</p><Link href="/customers/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">Créer un client</Link></div> : <NewSourcingForm customers={customers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, vip: c.vip ?? false }))} />}
    </div>
  );
}
