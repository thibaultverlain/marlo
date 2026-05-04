import { getAuthContext } from "@/lib/auth/require-role";
import { getShopDocuments } from "@/lib/db/queries/documents";
import DocumentsPageClient from "@/components/admin/documents-page-client";
export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") {
    return (
      <div className="space-y-6 page-enter">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Documents</h1>
        <div className="card-static p-12 text-center">
          <p className="text-zinc-500 text-sm">Acces reserve au proprietaire.</p>
        </div>
      </div>
    );
  }

  const docs = await getShopDocuments(ctx.shopId);

  return (
    <div className="max-w-4xl space-y-6 page-enter">
      <DocumentsPageClient documents={docs} />
    </div>
  );
}
