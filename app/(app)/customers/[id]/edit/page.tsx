import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCustomerById } from "@/lib/db/queries/customers";
import EditCustomerForm from "@/components/customers/edit-customer-form";

export const dynamic = "force-dynamic";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href={`/customers/${customer.id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Modifier le client</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{customer.firstName} {customer.lastName}</p>
        </div>
      </div>
      <EditCustomerForm customer={customer} />
    </div>
  );
}
