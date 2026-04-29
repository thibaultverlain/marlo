import { requireRole } from "@/lib/auth/require-role";
import { getTeamMemberWithEmail, getPendingInvitations, getShop, getRecentActivity } from "@/lib/db/queries/team";
import TeamPageClient from "@/components/team/team-page-client";
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await requireRole("owner");
  const [members, invitations, shop, activity] = await Promise.all([
    getTeamMemberWithEmail(ctx.shopId),
    getPendingInvitations(ctx.shopId),
    getShop(ctx.shopId),
    getRecentActivity(ctx.shopId, 20),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">Équipe</h1>
        <p className="text-[var(--color-text-muted)] mt-1 text-sm">
          Gérez les membres de <span className="text-[var(--color-text)]">{shop?.name || "votre boutique"}</span>
        </p>
      </div>

      <TeamPageClient
        members={members}
        invitations={invitations}
        shopName={shop?.name || ""}
        currentUserId={ctx.userId}
        activity={activity}
      />
    </div>
  );
}
