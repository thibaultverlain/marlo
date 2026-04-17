import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import NewCustomerForm from "@/components/customers/new-customer-form";

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl text-white">Nouveau client</h1><p className="text-sm text-zinc-500 mt-0.5">Créer une fiche client</p></div>
      </div>
      <NewCustomerForm />
    </div>
  );
}
