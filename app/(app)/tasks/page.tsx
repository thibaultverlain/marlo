import { getAuthContext } from "@/lib/auth/require-role";
import { getShopTasks, getTaskCounts } from "@/lib/db/queries/tasks";
import { getTeamMemberWithEmail } from "@/lib/db/queries/team";
import TasksPageClient from "@/components/tasks/tasks-page-client";
export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const sp = await searchParams;
  const filter = (sp.filter as "all" | "mine" | "open") || "open";
  const ctx = await getAuthContext();
  const [tasks, counts, members] = await Promise.all([
    getShopTasks(ctx.shopId, filter, ctx.userId),
    getTaskCounts(ctx.shopId, ctx.userId),
    getTeamMemberWithEmail(ctx.shopId),
  ]);

  return (
    <div className="space-y-6 page-enter">
      <TasksPageClient
        tasks={tasks}
        counts={counts}
        members={members}
        currentUserId={ctx.userId}
        activeFilter={filter}
      />
    </div>
  );
}
