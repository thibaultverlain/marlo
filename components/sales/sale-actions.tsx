"use client";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, AlertCircle } from "lucide-react";
import { generateInvoiceFromSaleAction } from "@/lib/actions/invoices";

export default function SaleActions({ saleId }: { saleId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generateInvoiceFromSaleAction(saleId);
      if ("error" in result && result.error) setError(result.error);
      else if ("invoiceId" in result) router.push(`/invoices/${result.invoiceId}`);
    });
  }

  return (
    <div>
      {error && <div className="flex items-start gap-2 p-3 mb-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
      <button onClick={handleGenerate} disabled={isPending} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"><FileText size={16} />{isPending ? "Génération..." : "Générer la facture"}</button>
    </div>
  );
}
