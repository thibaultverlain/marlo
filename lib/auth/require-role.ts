import { createSupabaseServerClient } from "@/lib/supabase/server";
import { db } from "@/lib/db/client";
import { teamMembers, shops } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { TeamRole } from "@/lib/db/schema";

export type AuthContext = {
  userId: string;
  shopId: string;
  role: TeamRole;
  shopName: string;
};

/**
 * ROLE HIERARCHY:
 * owner   → full access (team, settings, compta, factures, everything)
 * manager → stock, ventes, clients, sourcing, PS, analytics — NOT compta, settings, team
 * seller  → stock (read), ventes (own), clients (read) — limited
 */

const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 3,
  manager: 2,
  seller: 1,
};

/**
 * Get the authenticated user's context (user, shop, role).
 * If the user has no shop yet, auto-creates one (migration path for existing users).
 * Throws if not authenticated.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifié");
  }

  // Find the user's team membership (for now, first shop they belong to)
  const membership = await db
    .select({
      shopId: teamMembers.shopId,
      role: teamMembers.role,
      shopName: shops.name,
    })
    .from(teamMembers)
    .innerJoin(shops, eq(shops.id, teamMembers.shopId))
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (membership.length > 0) {
    return {
      userId: user.id,
      shopId: membership[0].shopId,
      role: membership[0].role,
      shopName: membership[0].shopName,
    };
  }

  // No shop found — auto-create for existing users (migration path)
  // This ensures backward compatibility: existing single-user becomes owner
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
  };
}

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
 * Check if a role has access to a specific feature.
 */
const FEATURE_ACCESS: Record<string, TeamRole> = {
  team: "owner",
  settings: "owner",
  accounting: "owner",
  invoices: "owner",
  analytics: "manager",
  sourcing: "manager",
  "personal-shopping": "manager",
  customers: "manager",
  products: "seller",
  sales: "seller",
  dashboard: "seller",
};

export function canAccess(role: TeamRole, feature: string): boolean {
  const requiredRole = FEATURE_ACCESS[feature] || "owner";
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
}

export async function requireFeatureAccess(feature: string): Promise<AuthContext> {
  const ctx = await getAuthContext();
  const requiredRole = FEATURE_ACCESS[feature] || "owner";

  if (ROLE_HIERARCHY[ctx.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new Error(`Accès refusé à ${feature}. Rôle requis : ${requiredRole}.`);
  }

  return ctx;
}
