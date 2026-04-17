import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllCustomers } from "@/lib/db/queries/customers";
import NewSourcingForm from "@/components/sourcing/new-sourcing-form";

export const dynamic = "force-dynamic";

export default async function NewSourcingPage() {
  const customers = await getAllCustomers();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sourcing" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl text-stone-900">Nouvelle demande de sourcing</h1>
          <p className="text-sm text-stone-400 mt-0.5">Un client cherche une pièce spécifique</p>
        </div>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-10 text-center">
          <p className="text-stone-500 mb-4">Aucun client enregistré.</p>
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Créer un client d'abord
          </Link>
        </div>
      ) : (
        <NewSourcingForm
          customers={customers.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            vip: c.vip ?? false,
          }))}
        />
      )}
    </div>
  );
}
