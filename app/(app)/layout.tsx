import Sidebar from "@/components/layout/sidebar";
import { getAuthContext, getUserShops } from "@/lib/auth/require-role";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let role = "owner";
  let permissions: string[] = [];
  let shops: { shopId: string; shopName: string; role: string }[] = [];
  let currentShopId = "";
  let currentShopName = "";

  try {
    const ctx = await getAuthContext();
    role = ctx.role;
    permissions = ctx.permissions;
    currentShopId = ctx.shopId;
    currentShopName = ctx.shopName;
    shops = (await getUserShops(ctx.userId)).map((s) => ({
      shopId: s.shopId,
      shopName: s.shopName,
      role: s.role,
    }));
  } catch {}

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar
        role={role}
        permissions={permissions}
        shops={shops}
        currentShopId={currentShopId}
        currentShopName={currentShopName}
      />
      <main className="lg:ml-[220px] min-h-screen pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
