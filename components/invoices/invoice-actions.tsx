"use client";

import { useTransition } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { markInvoiceAsSentAction, markInvoiceAsPaidAction } from "@/lib/actions/invoices";

export default function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function markAsSent() {
    startTransition(async () => {
      await markInvoiceAsSentAction(invoiceId);
    });
  }

  function markAsPaid() {
    startTransition(async () => {
      await markInvoiceAsPaidAction(invoiceId);
    });
  }

  if (status === "payee") return null;

  return (
    <div className="flex items-center justify-end gap-2">
      {status === "brouillon" && (
        <button
          onClick={markAsSent}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          <Send size={14} />
          Marquer comme envoyée
        </button>
      )}
      {(status === "brouillon" || status === "envoyee") && (
        <button
          onClick={markAsPaid}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          Marquer comme payée
        </button>
      )}
    </div>
  );
}
