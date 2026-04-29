import { db } from "../client";
import { tasks, type NewTask, type Task } from "../schema";
import { eq, and, desc, sql, inArray, isNull, or } from "drizzle-orm";

export async function getShopTasks(shopId: string, filter?: "all" | "mine" | "open", userId?: string): Promise<Task[]> {
  const conditions = [eq(tasks.shopId, shopId)];

  if (filter === "mine" && userId) {
    conditions.push(eq(tasks.assignedTo, userId));
  }
  if (filter === "open" || !filter) {
    conditions.push(inArray(tasks.status, ["a_faire", "en_cours"]));
  }

  return db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(
      sql`CASE WHEN priority = 'haute' THEN 0 WHEN priority = 'normale' THEN 1 ELSE 2 END`,
      sql`CASE WHEN status = 'a_faire' THEN 0 WHEN status = 'en_cours' THEN 1 ELSE 2 END`,
      desc(tasks.createdAt)
    );
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0];
}

export async function createTask(data: NewTask): Promise<Task> {
  const rows = await db.insert(tasks).values(data).returning();
  return rows[0];
}

export async function updateTask(id: string, data: Partial<NewTask>): Promise<Task | undefined> {
  const rows = await db
    .update(tasks)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0];
}

export async function deleteTask(id: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, id));
}

export async function completeTask(id: string): Promise<Task | undefined> {
  const rows = await db
    .update(tasks)
    .set({ status: "fait", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(tasks.id, id))
    .returning();
  return rows[0];
}

export async function getTaskCounts(shopId: string, userId?: string) {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) filter (where status in ('a_faire', 'en_cours'))::int`,
      mine: sql<number>`count(*) filter (where assigned_to = ${userId ?? ''} and status in ('a_faire', 'en_cours'))::int`,
      overdue: sql<number>`count(*) filter (where status in ('a_faire', 'en_cours') and due_date < current_date)::int`,
      haute: sql<number>`count(*) filter (where priority = 'haute' and status in ('a_faire', 'en_cours'))::int`,
    })
    .from(tasks)
    .where(eq(tasks.shopId, shopId));

  return rows[0] ?? { total: 0, open: 0, mine: 0, overdue: 0, haute: 0 };
}
