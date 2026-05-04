import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { teamMembers, shops } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import type { TeamRole } from "@/lib/db/schema";
import { ALL_PERMISSIONS, type Permission } from "@/lib/db/schema";

export type AuthContext = {
  userId: string;
  shopId: string;
  role: TeamRole;
  shopName: string;
  permissions: string[];
};

export type UserShop = {
  shopId: string;
  shopName: string;
  role: TeamRole;
};

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 3,
  manager: 2,
  seller: 1,
};

const SHOP_COOKIE = "marlo-shop";

/**
 * Get all shops the user belongs to.
 * Cached per request.
 */
export const getUserShops = cache(async (userId: string): Promise<UserShop[]> => {
  return db
    .select({
      shopId: teamMembers.shopId,
      shopName: shops.name,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(shops, eq(shops.id, teamMembers.shopId))
    .where(eq(teamMembers.userId, userId));
});

/**
 * Get the authenticated user's context (user, shop, role).
 * Reads the active shop from the `marlo-shop` cookie.
 * Falls back to the first shop if cookie is missing or invalid.
 * Cached per request via React cache().
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifie");
  }

  const allMemberships = await getUserShops(user.id);

  if (allMemberships.length > 0) {
    const cookieStore = await cookies();
    const activeShopId = cookieStore.get(SHOP_COOKIE)?.value;

    let selectedShop = allMemberships[0];
    if (activeShopId) {
      const match = allMemberships.find((m) => m.shopId === activeShopId);
      if (match) selectedShop = match;
    }

    // Resolve permissions for this membership
    const perms = await resolvePermissions(user.id, selectedShop.shopId, selectedShop.role);

    return {
      userId: user.id,
      shopId: selectedShop.shopId,
      role: selectedShop.role,
      shopName: selectedShop.shopName,
      permissions: perms,
    };
  }

  // No shop found — auto-create for existing users
  const [newShop] = await db.insert(shops).values({
    name: "Ma boutique",
    ownerId: user.id,
  }).returning();

  await db.insert(teamMembers).values({
    shopId: newShop.id,
    userId: user.id,
    role: "owner",
  });

  return {
    userId: user.id,
    shopId: newShop.id,
    role: "owner",
    shopName: newShop.name,
    permissions: [...ALL_PERMISSIONS],
  };
});

/**
 * Require a minimum role level. Throws if the user doesn't have sufficient permissions.
 */
export async function requireRole(minimumRole: TeamRole): Promise<AuthContext> {
  const ctx = await getAuthContext();

  if (ROLE_HIERARCHY[ctx.role] < ROLE_HIERARCHY[minimumRole]) {
    throw new Error(`Accès refusé. Rôle requis : ${minimumRole}. Votre rôle : ${ctx.role}`);
  }

  return ctx;
}

/**
 * Resolve permissions for a user in a shop.
 * Owner always gets all permissions.
 * Others get permissions from their team_members.permissions JSON.
 * If no custom permissions set, fall back to role-based defaults.
 */
async function resolvePermissions(userId: string, shopId: string, role: TeamRole): Promise<string[]> {
  if (role === "owner") return [...ALL_PERMISSIONS];

  const [member] = await db
    .select({ permissions: teamMembers.permissions })
    .from(teamMembers)
    .where(and(eq(teamMembers.shopId, shopId), eq(teamMembers.userId, userId)))
    .limit(1);

  if (member?.permissions) {
    try {
      return JSON.parse(member.permissions);
    } catch {}
  }

  // Default permissions by role
  if (role === "manager") {
    return ["dashboard", "products", "sales", "customers", "analytics", "sourcing", "personal_shopping", "tasks", "templates"];
  }
  return ["dashboard", "products", "sales", "tasks"];
}

/**
 * Check if the current user has a specific permission.
 */
export function canAccess(ctx: AuthContext, feature: string): boolean {
  if (ctx.role === "owner") return true;
  return ctx.permissions.includes(feature);
}

export async function requireFeatureAccess(feature: string): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!canAccess(ctx, feature)) {
    throw new Error(`Acces refuse a ${feature}.`);
  }
  return ctx;
}
