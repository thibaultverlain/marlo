import { getAuthContext } from "@/lib/auth/require-role";
import { getTeamMemberWithEmail, getPendingInvitations, getShop, getRecentActivity } from "@/lib/db/queries/team";
import TeamPageClient from "@/components/team/team-page-client";
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") {
    return (
      <div className="space-y-6 page-enter">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Equipe</h1>
        <div className="card-static p-12 text-center">
          <p className="text-zinc-500 text-sm">Acces reserve au proprietaire de la boutique.</p>
        </div>
      </div>
    );
  }
  const [members, invitations, shop, activity] = await Promise.all([
    getTeamMemberWithEmail(ctx.shopId),
    getPendingInvitations(ctx.shopId),
    getShop(ctx.shopId),
    getRecentActivity(ctx.shopId, 20),
  ]);

  return (
    <div className="max-w-4xl space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Equipe</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          Gerez les membres de <span className="text-white">{shop?.name || "votre boutique"}</span>
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
