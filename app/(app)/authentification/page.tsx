import { getAuthContext } from "@/lib/auth/require-role";
import { getShopAuthChecks } from "@/lib/db/queries/authentification";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq, and, notInArray } from "drizzle-orm";
import AuthPageClient from "@/components/authentification/auth-page-client";
export const dynamic = "force-dynamic";

export default async function AuthentificationPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; productId?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getAuthContext();

  const [checks, stockProducts] = await Promise.all([
    getShopAuthChecks(ctx.shopId),
    db.select().from(products).where(and(
      eq(products.shopId, ctx.shopId),
      notInArray(products.status, ["vendu", "livre", "retourne"]),
    )),
  ]);

  return (
    <AuthPageClient
      checks={checks}
      products={stockProducts}
      prefillBrand={sp.brand}
      prefillProductId={sp.productId}
    />
  );
}
