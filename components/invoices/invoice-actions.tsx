"use client";
import { useTransition } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { markInvoiceAsSentAction, markInvoiceAsPaidAction } from "@/lib/actions/invoices";

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  if (status === "payee") return null;
  return (
    <div className="flex items-center justify-end gap-2">
      {status === "brouillon" && <button onClick={() => startTransition(async () => { await markInvoiceAsSentAction(invoiceId); })} disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors disabled:opacity-50"><Send size={14} />Marquer envoyée</button>}
      {(status === "brouillon" || status === "envoyee") && <button onClick={() => startTransition(async () => { await markInvoiceAsPaidAction(invoiceId); })} disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"><CheckCircle2 size={14} />Marquer payée</button>}
    </div>
  );
}
