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

type MembershipRow = {
  shopId: string;
  shopName: string;
  role: TeamRole;
  permissions: string | null;
};

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 3,
  manager: 2,
  seller: 1,
};

const SHOP_COOKIE = "marlo-shop";

const DEFAULT_PERMS: Record<TeamRole, string[]> = {
  owner: [...ALL_PERMISSIONS],
  manager: ["dashboard", "products", "sales", "customers", "analytics", "sourcing", "personal_shopping", "tasks", "templates"],
  seller: ["dashboard", "products", "sales", "tasks"],
};

function resolvePerms(role: TeamRole, raw: string | null): string[] {
  if (role === "owner") return [...ALL_PERMISSIONS];
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }
  return DEFAULT_PERMS[role] ?? DEFAULT_PERMS.seller;
}

/**
 * Single DB query: get all memberships with permissions included.
 * Cached per request.
 */
const getAllMemberships = cache(async (userId: string): Promise<MembershipRow[]> => {
  return db
    .select({
      shopId: teamMembers.shopId,
      shopName: shops.name,
      role: teamMembers.role,
      permissions: teamMembers.permissions,
    })
    .from(teamMembers)
    .innerJoin(shops, eq(shops.id, teamMembers.shopId))
    .where(eq(teamMembers.userId, userId));
});

/**
 * Get all shops (without permissions). Derived from cached memberships.
 */
export const getUserShops = cache(async (userId: string): Promise<UserShop[]> => {
  const rows = await getAllMemberships(userId);
  return rows.map(({ shopId, shopName, role }) => ({ shopId, shopName, role }));
});

/**
 * Get the authenticated user's context.
 * 1 Supabase Auth call + 1 DB call (cached). Zero extra queries.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifie");
  }

  const memberships = await getAllMemberships(user.id);

  if (memberships.length > 0) {
    const cookieStore = await cookies();
    const activeShopId = cookieStore.get(SHOP_COOKIE)?.value;

    let selected = memberships[0];
    if (activeShopId) {
      const match = memberships.find((m) => m.shopId === activeShopId);
      if (match) selected = match;
    }

    return {
      userId: user.id,
      shopId: selected.shopId,
      role: selected.role,
      shopName: selected.shopName,
      permissions: resolvePerms(selected.role, selected.permissions),
    };
  }

  // Auto-create shop for existing users
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

export async function requireRole(minimumRole: TeamRole): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (ROLE_HIERARCHY[ctx.role] < ROLE_HIERARCHY[minimumRole]) {
    throw new Error(`Acces refuse. Role requis : ${minimumRole}.`);
  }
  return ctx;
}

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
