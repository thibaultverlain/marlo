import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import { getSourcingById } from "@/lib/db/queries/sourcing";
import { getAllCustomers } from "@/lib/db/queries/customers";
import EditSourcingForm from "@/components/sourcing/edit-sourcing-form";

export const dynamic = "force-dynamic";

export default async function EditSourcingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await getAuthContext();
  const [sourcing, customers] = await Promise.all([
    getSourcingById(id),
    getAllCustomers(shopId),
  ]);
  if (!sourcing) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href={`/sourcing/${sourcing.id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Modifier la demande</h1>
          <p className="text-sm text-zinc-500 mt-0.5 truncate max-w-[400px]">{sourcing.description}</p>
        </div>
      </div>
      <EditSourcingForm
        sourcing={sourcing as any}
        customers={customers.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          vip: !!c.vip,
        }))}
      />
    </div>
  );
}
