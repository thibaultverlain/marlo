"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuthContext, getUserShops } from "@/lib/auth/require-role";

const SHOP_COOKIE = "marlo-shop";

export async function switchShopAction(shopId: string) {
  try {
    const ctx = await getAuthContext();
    const userShops = await getUserShops(ctx.userId);
    const valid = userShops.find((s) => s.shopId === shopId);

    if (!valid) {
      return { error: "Boutique introuvable ou acces refuse" };
    }

    const cookieStore = await cookies();
    cookieStore.set(SHOP_COOKIE, shopId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    revalidatePath("/", "layout");
    return { success: true, shopName: valid.shopName };
  } catch (err: any) {
    return { error: err.message || "Erreur lors du changement de boutique" };
  }
}
